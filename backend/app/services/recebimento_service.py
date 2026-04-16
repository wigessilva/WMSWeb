from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from ..models.recebimento import Recebimento, RecebimentoItem, RecebimentoSessoes, RecebimentoLeitura
from ..models.historico_xml import HistoricoXML
from ..models.vinculo_fornecedor import VinculoProdutoFornecedor
from ..models.unidade_medida import UnidadeMedida
from ..models.vinculo_unidade import VinculoUnidade
from ..schemas.recebimento import RecebimentoCriar
from ..enums import StatusRecebimento, StatusRecebimentoItem
from ..core.event_bus import event_bus
from ..domain.recebimento_fsm import RecebimentoFSM, RecebimentoItemFSM
from ..models.log_transicao import LogTransicao
from ..models.usuario import Usuario
from ..models.produto import Produto
from ..models.filial import Filial
from ..models.perfil import Perfil
from ..models.permissao import Permissao
from ..models.unidade_produto import UnidadeProduto
from ..models.parametros_mestres import ParametrosMestres
from ..models.familia import Familia
from ..models.area import Area
from ..models.estrutura_fisica import EstruturaFisica
from ..models.finalidade_endereco import FinalidadeEndereco
from ..models.endereco import Endereco
from ..models.ua import UA
from ..models.historico_ua import HistoricoUA
from ..models.configuracao_integracao import ConfiguracaoIntegracao


class RecebimentoService:
    @staticmethod
    def importar_xml(db: Session, db_erp: Session, dados: RecebimentoCriar, cnpj_fornecedor: str):
        # Verifica se a nota já foi importada para evitar duplicidade
        recebimento_existente = db.query(Recebimento).filter(Recebimento.nfe == dados.nfe).first()
        if recebimento_existente:
            raise ValueError(f"A NFe {dados.nfe} já foi importada anteriormente.")

        # 0. Verifica se a OC (que veio da tag <xPed>) existe no ERP
        oc_verificada = None
        if dados.oc:
            # Procura no ERP pela coluna correta (NumeroOC)
            query_erp = text("SELECT 1 FROM PedidosCompra WITH (NOLOCK) WHERE NumeroOC = :oc")
            resultado_erp = db_erp.execute(query_erp, {"oc": dados.oc}).first()
            if resultado_erp:
                oc_verificada = dados.oc

        # 1. Cria o Cabeçalho (O Romaneio)
        db_receb = Recebimento(
            nfe=dados.nfe,
            oc=oc_verificada,  # Salva a OC se encontrou no ERP, senão insere Null
            fornecedor=dados.fornecedor,
            status=StatusRecebimento.IMPORTADO.value
        )
        
        # Integração com FSM
        fsm_rec = RecebimentoFSM(db_receb)
        # Notas sem OC não são mais bloqueadas aqui, elas irão para liberação sujeitas à permissão
        db.add(db_receb)
        db.flush()  # Guarda temporariamente para gerar o ID (Romaneio)

        # 1.5 Salva a tag original na tabela de histórico
        db_historico = HistoricoXML(
            nfe=dados.nfe,
            xped_original=dados.oc,
            cnpj_emitente=cnpj_fornecedor
        )
        db.add(db_historico)

        # 2. Insere os itens e tenta fazer a tradução (De/Para) automaticamente
        for item_dados in dados.itens:
            # Tenta descobrir o SKU interno (estritamente via CodigoFornecedor e Cnpj)
            vinculo_prod = db.query(VinculoProdutoFornecedor).filter(
                VinculoProdutoFornecedor.cnpj_fornecedor == cnpj_fornecedor,
                VinculoProdutoFornecedor.codigo_fornecedor == item_dados.codigo_fornecedor
            ).first()

            # Tenta descobrir a Unidade interna
            # Confere primeiro se existe na tabela UnidadesMedida (sigla exata ou case-insensitive)
            unidade_interna_direta = db.query(UnidadeMedida).filter(
                UnidadeMedida.sigla.ilike(item_dados.und)
            ).first()

            vinculo_und = None
            if not unidade_interna_direta:
                # Se não achou direto, confere na tabela de vínculos
                vinculo_und = db.query(VinculoUnidade).filter(
                    VinculoUnidade.unidade_externa.ilike(item_dados.und)
                ).first()

            # Define o status do item
            sku_encontrado = vinculo_prod.produto_id if vinculo_prod else None
            unidade_resolvida = unidade_interna_direta or vinculo_und
            status_item = StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value if (
                    sku_encontrado and unidade_resolvida) else StatusRecebimentoItem.PENDENTE_VINCULO.value

            # Se achou o SKU, usa a descrição do cadastro de produtos para manter consistência
            descricao_final = item_dados.descricao
            if sku_encontrado:
                from app.models.produto import Produto
                prod = db.query(Produto).filter(Produto.id == sku_encontrado).first()
                if prod:
                    descricao_final = prod.descricao

            # Bonificação: CFOPs padrão (1910, 1911, 2910, 2911, 5910, 5911, 6910, 6911)
            f_bonificacao = False
            if item_dados.cfop:
                cfop_limpo = item_dados.cfop.replace(".", "")
                if cfop_limpo in ["1910", "1911", "2910", "2911", "5910", "5911", "6910", "6911"]:
                    f_bonificacao = True

            novo_item = RecebimentoItem(
                recebimento_id=db_receb.id,
                descricao=descricao_final,
                descricao_nota=item_dados.descricao,
                qtd_nota=item_dados.qtd_nota,
                valor_unitario=item_dados.valor_unitario,
                und=item_dados.und,
                codigo_fornecedor=item_dados.codigo_fornecedor,
                sku=sku_encontrado,
                status=status_item,
                cfop=item_dados.cfop,
                is_bonificacao=f_bonificacao
            )
            db.add(novo_item)

        db.commit()
        db.refresh(db_receb)

        # VALIDAÇÃO DE PREÇO (Se tem OC)
        RecebimentoService._validar_divergencia_precos(db, db_erp, db_receb.id)

        # 3. Roda a máquina de estados para atualizar o status do Romaneio
        return RecebimentoService.atualizar_status_pai(db, db_receb.id)

    @staticmethod
    def atualizar_status_pai(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            return None

        # Se já passou da fase de libertação, as mudanças são manuais, não mexe.
        status_avancados = [
            StatusRecebimento.AGUARDANDO_CONFERENCIA.value, 
            StatusRecebimento.LIBERADO.value, 
            StatusRecebimento.EM_CONFERENCIA.value, 
            StatusRecebimento.EM_ANALISE.value, 
            StatusRecebimento.FINALIZADO.value, 
            StatusRecebimento.REJEITADO.value,
            StatusRecebimento.DIVERGENTE.value
        ]
        if recebimento.status in status_avancados:
            return recebimento

        itens = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).all()

        # 1. Recalcula e garante o status correto de todos os itens da nota
        for item in itens:
            if item.status in [StatusRecebimentoItem.CONFERIDO.value, StatusRecebimentoItem.DIVERGENTE.value]:
                continue
                
            unidade_resolvida = db.query(UnidadeMedida).filter(UnidadeMedida.sigla.ilike(item.und)).first() or \
                                db.query(VinculoUnidade).filter(VinculoUnidade.unidade_externa.ilike(item.und)).first()
            
            status_correto = StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value if (item.sku and unidade_resolvida) else StatusRecebimentoItem.PENDENTE_VINCULO.value
            
            if item.status != status_correto:
                item.status = status_correto
                if status_correto == StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value:
                    event_bus.publish('SKU_VINCULADO_SUCESSO', {'item_id': item.id, 'sku': item.sku})

        # 2. Recalcula o status do cabeçalho (Romaneio) com base na saúde dos itens
        tem_pendencia = any(item.status == StatusRecebimentoItem.PENDENTE_VINCULO.value for item in itens)
        status_pai_correto = StatusRecebimento.PENDENTE.value if tem_pendencia else StatusRecebimento.AGUARDANDO_LIBERACAO.value

        if recebimento.status != status_pai_correto:
            if recebimento.status == StatusRecebimento.BLOQUEADO.value and not tem_pendencia:
                recebimento.status = status_pai_correto
                event_bus.publish('RECEBIMENTO_AGUARDANDO_LIBERACAO', {'id': recebimento_id})
            elif recebimento.status != StatusRecebimento.BLOQUEADO.value:
                recebimento.status = status_pai_correto
                if status_pai_correto == StatusRecebimento.AGUARDANDO_LIBERACAO.value:
                    event_bus.publish('RECEBIMENTO_AGUARDANDO_LIBERACAO', {'id': recebimento_id})

        db.commit()
        db.refresh(recebimento)
        return recebimento

    # # # AÇÕES MANUAIS DE GESTÃO E AUDITORIA # # #
    @staticmethod
    def _validar_divergencia_precos(db: Session, db_erp: Session, recebimento_id: int):
        from app.models.parametros_mestres import ParametrosMestres
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento or not recebimento.oc:
            return None

        # Busca itens da OC no ERP
        query_itens_erp = text("SELECT * FROM PedidosCompraItens WITH (NOLOCK) WHERE NumeroOC = :oc")
        itens_oc = db_erp.execute(query_itens_erp, {"oc": recebimento.oc}).mappings().all()
        if not itens_oc:
            return None

        # Busca parâmetros mestres para ver a tolerância
        params = db.query(ParametrosMestres).first()
        tipo_tol = params.tolerancia_financeira_tipo if params else "VALOR"
        v_tol = params.tolerancia_financeira_valor if params else 0.0

        discrepancias = []
        houve_discrepancia_fora_tolerancia = False

        from app.models.produto import Produto
        from app.models.unidade_produto import UnidadeProduto

        # Conta quantos itens a nota possui no total para decidir se mostra SKU nos cards
        total_itens_nota = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).count()

        for item in recebimento.itens:
            # Pula itens de bonificação na validação de 3-way match
            if item.is_bonificacao:
                continue

            if not item.sku:
                continue
            
            # Resolve a unidade
            unidade_resolvida = db.query(UnidadeMedida).filter(UnidadeMedida.sigla.ilike(item.und)).first() or \
                               db.query(VinculoUnidade).filter(VinculoUnidade.unidade_externa.ilike(item.und)).first()
            if not unidade_resolvida:
                continue

            # item.sku no item de recebimento guarda o ID do produto
            prod = db.query(Produto).filter(Produto.id == item.sku).first()
            if not prod:
                continue

            # Tenta achar o item na OC pelo SKU (string)
            item_oc = next((i for i in itens_oc if str(i["Sku"]) == prod.sku), None)
            if not item_oc:
                continue
            
            preco_oc = float(item_oc["PrecoUnitario"])
            und_oc_sigla = str(item_oc["Und"]).upper()
            
            # Fator OC
            fator_oc = 1.0
            und_medida_oc = db.query(UnidadeMedida).filter(UnidadeMedida.sigla == und_oc_sigla).first()
            if und_medida_oc:
                up_oc = db.query(UnidadeProduto).filter(
                    UnidadeProduto.produto_id == prod.id,
                    UnidadeProduto.unidade_medida_id == und_medida_oc.id
                ).first()
                if up_oc:
                    fator_oc = up_oc.fator_conversao
            
            # Fator XML
            fator_xml = 1.0
            id_und_xml = unidade_resolvida.id if hasattr(unidade_resolvida, 'id') else unidade_resolvida.unidade_medida_id
            up_xml = db.query(UnidadeProduto).filter(
                UnidadeProduto.produto_id == prod.id,
                UnidadeProduto.unidade_medida_id == id_und_xml
            ).first()
            if up_xml:
                fator_xml = up_xml.fator_conversao
            
            # Compara Qtd
            qtd_oc = float(item_oc["Qtd"])
            qtd_recebida_oc = float(item_oc.get("QtdRecebida", 0))
            saldo_oc = qtd_oc - qtd_recebida_oc
            fator_relativo_xml = (fator_oc if fator_oc > 0 else 1.0) / (fator_xml if fator_xml > 0 else 1.0)
            saldo_esperado_xml = saldo_oc * fator_relativo_xml
            qtd_faturada = float(item.qtd_nota)
            
            # Compara Preço
            preco_base_oc = preco_oc / (fator_oc if fator_oc > 0 else 1.0)
            preco_base_xml = float(item.valor_unitario or 0.0) / (fator_xml if fator_xml > 0 else 1.0)
            preco_xml_na_und_oc = preco_base_xml * fator_oc
            
            prefixo = f"{prod.sku}: " if total_itens_nota > 1 else ""
            teve_erro = False

            if qtd_faturada > saldo_esperado_xml + 0.01:
                houve_discrepancia_fora_tolerancia = True
                item.status = StatusRecebimentoItem.DIVERGENTE.value
                discrepancias.append(
                    f"{prefixo}Saldo Pendente OC (Faturado: {qtd_faturada} > Saldo: {saldo_esperado_xml:.2f})"
                )
                teve_erro = True
            
            if preco_xml_na_und_oc > preco_oc:
                # Calcula a diferença para ver se está na tolerância
                diff = preco_xml_na_und_oc - preco_oc
                esta_na_tolerancia = False
                
                if preco_oc > 0:
                    if tipo_tol == "VALOR":
                        if diff <= v_tol:
                            esta_na_tolerancia = True
                    else: # PORCENTAGEM
                        percentual_diff = (diff / preco_oc) * 100
                        if percentual_diff <= v_tol:
                            esta_na_tolerancia = True

                if not esta_na_tolerancia:
                    houve_discrepancia_fora_tolerancia = True
                    item.status = StatusRecebimentoItem.DIVERGENTE.value
                else:
                    # Se estava divergente mas agora está na tolerância, voltamos o item para o fluxo normal
                    if item.status == StatusRecebimentoItem.DIVERGENTE.value:
                        item.status = StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value
                
                preco_xml_na_und_oc = preco_base_xml * fator_oc
                # Remove o prefixo se houver apenas um item para evitar redundância na mensagem
                discrepancias.append(
                    f"{prefixo}Preço XML (R$ {preco_xml_na_und_oc:.2f}) > Preço OC (R$ {preco_oc:.2f})"
                )
                if not esta_na_tolerancia:
                    teve_erro = True
            
            if not teve_erro:
                # Caso não haja erro nem de preço nem de qtd, limpamos
                if item.status == StatusRecebimentoItem.DIVERGENTE.value:
                    item.status = StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value

        if discrepancias:
            if houve_discrepancia_fora_tolerancia:
                recebimento.status = StatusRecebimento.DIVERGENTE.value
                recebimento.dentro_da_tolerancia = False
            else:
                recebimento.dentro_da_tolerancia = True
                # Se o romaneio estava DIVERGENTE mas agora está na tolerância, volta para IMPORTADO
                if recebimento.status == StatusRecebimento.DIVERGENTE.value:
                    recebimento.status = StatusRecebimento.IMPORTADO.value
            
            recebimento.divergencia_financeira = " | ".join(discrepancias)
        else:
            recebimento.dentro_da_tolerancia = False
            recebimento.divergencia_financeira = None
            # Se não há nenhuma discrepância e estava marcado como divergente, volta para o fluxo
            if recebimento.status == StatusRecebimento.DIVERGENTE.value:
                recebimento.status = StatusRecebimento.IMPORTADO.value
        
        db.commit()
        return bool(discrepancias and houve_discrepancia_fora_tolerancia)

    @staticmethod
    def revalidar_precos_pendentes(db: Session):
        from app.db.database import SessionLocalERP
        db_erp = SessionLocalERP()
        try:
            statuses_para_revalidar = [
                StatusRecebimento.IMPORTADO.value,
                StatusRecebimento.PENDENTE.value,
                StatusRecebimento.DIVERGENTE.value,
                StatusRecebimento.AGUARDANDO_LIBERACAO.value
            ]
            recebimentos = db.query(Recebimento).filter(
                Recebimento.status.in_(statuses_para_revalidar)
            ).all()
            
            for rec in recebimentos:
                # Chama a validação individual (que já atualiza status e log)
                RecebimentoService._validar_divergencia_precos(db, db_erp, rec.id)
                # Recalcula o status pai para garantir que ele volte para AGUARDANDO_LIBERACAO 
                # ou PENDENTE conforme as regras de negócio
                RecebimentoService.atualizar_status_pai(db, rec.id)
                
            db.commit()
        except Exception as e:
            # Em caso de erro, apenas loga e deixa os status atuais
            import logging
            logging.error(f"Erro ao revalidar preços pendentes: {e}")
        finally:
            db_erp.close()

    @staticmethod
    def _registrar_log(db: Session, tabela: str, registro_id: int, acao: str, gatilho: str = "MANUAL", estado_anterior: str = None, estado_novo: str = None, usuario: str = "Sistema", observacao: str = None):
        log = LogTransicao(
            tabela=tabela,
            registro_id=registro_id,
            acao=acao,
            gatilho=gatilho,
            estado_anterior=estado_anterior,
            estado_novo=estado_novo,
            usuario=usuario,
            observacao=observacao
        )
        db.add(log)

    @staticmethod
    def autorizar_recebimento(db: Session, recebimento_id: int, login_autorizador: str, senha_autorizador: str, ip_address: str = None):
        import bcrypt
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")
            
        if recebimento.oc:
            raise ValueError("Romaneio já possui OC, não necessita autorização especial.")

        usuario = db.query(Usuario).filter(Usuario.login == login_autorizador).first()
        if not usuario or not bcrypt.checkpw(senha_autorizador.encode('utf-8'), usuario.senha_hash.encode('utf-8')):
            raise ValueError("Credenciais inválidas.")

        # Verifica se o perfil do usuário possui a permissão específica via chave
        tem_permissao = any(p.chave == "RECEBIMENTO.LIBERAR_SEM_OC" for p in usuario.perfil_relacao.permissoes)
        
        if not tem_permissao:
            raise ValueError(f"O usuário {usuario.nome} não possui permissão para aprovar romaneios sem OC.")

        recebimento.autorizado_por = usuario.login
        recebimento.autorizado_em = datetime.now()
        
        RecebimentoService._registrar_log(
            db, tabela="Recebimentos", registro_id=recebimento.id, 
            acao="Autorização de Liberação sem OC",
            gatilho="MANUAL",
            estado_anterior=recebimento.status,
            estado_novo=recebimento.status,
            usuario=usuario.login,
            observacao=f"Autorizado manualmente via modal de supervisor (Origem: {ip_address or 'Desconhecida'})"
        )
        db.commit()
        
        # Após autorizado com sucesso, pode liberar a conferência
        return RecebimentoService.liberar_romaneio(db, recebimento.id, usuario_acao=usuario.login)

    @staticmethod
    def liberar_romaneio(db: Session, recebimento_id: int, usuario_acao: str = "Sistema"):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        if not recebimento.oc and not recebimento.autorizado_por:
            # Se for uma nota que contém APENAS itens de bonificação, permite liberar sem OC
            apenas_bonificacao = all(it.is_bonificacao for it in recebimento.itens)
            if not apenas_bonificacao:
                raise ValueError("Não é possível liberar um romaneio sem OC e sem autorização do supervisor.")

        # Trava de Segurança: Não permite liberar se houver itens pendentes de vínculo (Segurança anti-concorrência)
        itens_pendentes = [it for it in recebimento.itens if it.status == StatusRecebimentoItem.PENDENTE_VINCULO.value or it.sku is None]
        if itens_pendentes:
            raise ValueError(f"Não é possível liberar: existem {len(itens_pendentes)} itens pendentes de vínculo de SKU.")

        estado_anterior = recebimento.status
        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.liberar_conferencia()
            # Define o início global do processo de conferência ao liberar
            if not recebimento.inicio:
                recebimento.inicio = datetime.now()
                
            event_bus.publish('RECEBIMENTO_AGUARDANDO_CONFERENCIA', {'id': recebimento_id})
            
            # Avança os itens que estavam aguardando para a nova fase
            for item in recebimento.itens:
                if item.status in [StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value, StatusRecebimentoItem.DIVERGENTE.value]:
                    item.status = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value
                elif estado_anterior == StatusRecebimento.PARCIAL.value:
                    # Se estava PARCIAL e estamos liberando, os itens com falta devem ser reconferidos!
                    # Os que já bateram a quantidade ficam onde estão (CONFERIDO).
                    if (item.qtd_recebida or 0) < item.qtd_nota:
                        item.status = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value
                        item.tentativas = (item.tentativas or 1) + 1
            
            RecebimentoService._registrar_log(
                db, tabela="Recebimentos", registro_id=recebimento.id, 
                acao="Liberar Conferência",
                gatilho="MANUAL",
                estado_anterior=estado_anterior,
                estado_novo=recebimento.status,
                usuario=usuario_acao
            )
        except Exception as e:
            raise ValueError("O romaneio possui pendências ou não está aguardando liberação.")

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def iniciar_conferencia(db: Session, recebimento_id: int, conferente_id: str):
        # Lock pessimista (UPDLOCK no SQL Server) para evitar race condition
        # Se dois usuários biparem ao mesmo tempo, o segundo ficará bloqueado
        # até o primeiro fazer commit, e então verá o status atualizado.
        recebimento = db.query(Recebimento).filter(
            Recebimento.id == recebimento_id
        ).with_for_update().first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        # Se já estiver em conferência e for outra pessoa
        if recebimento.status == StatusRecebimento.EM_CONFERENCIA.value:
            if recebimento.conferente and recebimento.conferente != conferente_id:
                raise ValueError(f"Esta atividade já está sendo conferida por {recebimento.conferente}.")
            # Se for a mesma pessoa voltando, apenas retorna
            return recebimento

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.iniciar_conferencia()
            if not recebimento.inicio:
                recebimento.inicio = datetime.now()
            if not recebimento.inicio_conferencia:
                recebimento.inicio_conferencia = datetime.now()
            
            recebimento.conferente = conferente_id
            
            # Avança os itens para a fase de conferência
            for item in recebimento.itens:
                if item.status == StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value:
                    item.status = StatusRecebimentoItem.EM_CONFERENCIA.value
            event_bus.publish('RECEBIMENTO_EM_CONFERENCIA', {'id': recebimento_id, 'conferente': conferente_id})
        except Exception as e:
            raise ValueError(f"Não é possível iniciar a conferência: {str(e)}")

        db.commit()
        db.refresh(recebimento)
        return recebimento



    @staticmethod
    def cancelar_liberacao_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.cancelar_conferencia()
        except Exception as e:
            raise ValueError("Não é possível cancelar uma conferência neste status.")

        # Zera as contagens apagando as leituras e resetando qtd_recebida
        itens = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).all()
        for item in itens:
            item.qtd_recebida = 0.0
            from app.models.recebimento import RecebimentoLeitura
            db.query(RecebimentoLeitura).filter(RecebimentoLeitura.recebimento_item_id == item.id).delete()
            
            # Todos os itens regressam para aguardando liberação
            status_avancados = [StatusRecebimentoItem.CONFERIDO.value, StatusRecebimentoItem.DIVERGENTE.value, StatusRecebimentoItem.EM_CONFERENCIA.value, StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value]
            if item.status in status_avancados:
                item.status = StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def solicitar_reconferencia(db: Session, item_id: int, usuario: str, motivo: str = None):
        from app.models.ua import UA
        
        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()
        if not item:
            raise ValueError("Item não encontrado.")
            
        recebimento = item.recebimento
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        # 1. Incrementa as tentativas
        item.tentativas += 1
        
        # 2. Cria a nova sessão
        nova_sessao = RecebimentoSessoes(
            recebimento_item_id=item_id,
            numero_sessao=item.tentativas,
            criado_por=usuario,
            motivo=motivo
        )
        db.add(nova_sessao)
        
        # 3. Exclui as UAs físicas ligadas a este item (Reset do estoque físico)
        # Precisamos considerar o histórico para evitar erros de integridade
        from app.models.historico_ua import HistoricoUA
        
        # Busca os IDs das UAs que serão removidas (apenas as inconclusas da sessão atual)
        uas_para_remover = db.query(UA.id).filter(
            UA.produto_id == item.sku, 
            UA.status.in_(["Em Conferência", "Em Análise"]),
            UA.ua.in_(
                db.query(RecebimentoLeitura.ua).filter(RecebimentoLeitura.recebimento_item_id == item_id)
            )
        ).all()
        ua_ids = [u[0] for u in uas_para_remover]

        if ua_ids:
            # SOFT DELETE: Mudamos o status para ESTORNADA em vez de excluir fisicamente
            db.query(UA).filter(UA.id.in_(ua_ids)).update({"status": "ESTORNADA"}, synchronize_session=False)
            
            # Registra o evento de estorno no histórico de cada UA
            for uid in ua_ids:
                hist = HistoricoUA(
                    ua_id=uid,
                    tipo_acao="ESTORNO_RECONFERENCIA",
                    observacoes=f"UA cancelada para reconferência (Motivo: {motivo or 'Não informado'})",
                    criado_por=usuario
                )
                db.add(hist)

        # 4. Reseta as quantidades do item para a nova sessão (mas preserva histórico aprovado)
        RecebimentoService._recalcular_qtd_item(db, item)
        item.status = "AGUARDANDO_CONFERENCIA"
        
        # 5. Se o romaneio estiver em análise, divergente ou finalizado, volta para aguardando conferência
        if recebimento.status in ["EM_ANALISE", "DIVERGENTE", "FINALIZADO"]:
            recebimento.status = "AGUARDANDO_CONFERENCIA"
            # Limpa o início da conferência para que o card mostre "Aguardando..." ou o novo horário quando assumido
            recebimento.inicio_conferencia = None
            
        RecebimentoService._registrar_log(
            db, tabela="RecebimentoItens", registro_id=item.id,
            acao=f"Solicitação de Reconferência (Sessão {item.tentativas})",
            usuario=usuario,
            observacao=motivo
        )
        
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def registrar_conferencia_item(db: Session, item_id: int, dados: any, usuario: str):
        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()
        if not item:
            raise ValueError("Item não encontrado.")

        # 1. Atualiza o status do item (a tentativa já está controlada pelo banco nas sessões)
        item.status = dados.status_final
        # Busca as leituras reais do banco (sessão atual) para o resumo de qualidade
        # O frontend salva incrementalmente, então dados.leituras pode vir vazio
        from app.models.recebimento import RecebimentoLeitura
        sessao_atual = db.query(RecebimentoSessoes).filter(
            RecebimentoSessoes.recebimento_item_id == item.id,
            RecebimentoSessoes.numero_sessao == item.tentativas
        ).first()
        
        leituras_db = []
        if sessao_atual:
            leituras_db = db.query(RecebimentoLeitura).filter(
                RecebimentoLeitura.sessao_id == sessao_atual.id
            ).all()

        # Resumo de qualidade: se QUALQUER UA tiver "Não", o item fica "Não"
        def resumo_qualidade(campo):
            """Retorna 'Não' se qualquer leitura no banco tiver 'Não', senão 'Sim'."""
            for leit in leituras_db:
                if getattr(leit, campo, 'Sim') == 'Não':
                    return 'Não'
            return 'Sim'

        item.int_embalagem = resumo_qualidade('int_embalagem')
        item.int_material = resumo_qualidade('int_material')
        item.identificacao = resumo_qualidade('identificacao')
        item.cert_qual = resumo_qualidade('cert_qual')

        # Sincroniza o Lote e Validade finais a partir das leituras do banco
        if leituras_db:
            from datetime import datetime
            prim_leit = leituras_db[0]
            if prim_leit.lote:
                item.lote = prim_leit.lote
            if prim_leit.data_validade:
                try:
                    item.val = prim_leit.data_validade if isinstance(prim_leit.data_validade, datetime) else datetime.strptime(str(prim_leit.data_validade), "%d/%m/%Y")
                except:
                    pass


        # No salvamento incremental, a quantidade já foi atualizada a cada UA.
        # Caso o frontend envie a lista completa para garantir, podemos recalcular aqui também por segurança.
        # Recalcula e persiste a quantidade recebida total de forma inteligente (busca a última sessão)
        RecebimentoService._recalcular_qtd_item(db, item)

        db.commit()
        db.refresh(item)
        
        # --- WORKFLOW SIMPLIFICADO DE STATUS DE UAs ---
        # 4. Ao finalizar a conferência do item, movemos todas as UAs da sessão para "Em Análise"
        from app.models.recebimento import RecebimentoLeitura
        from app.models.ua import UA

        sessao = db.query(RecebimentoSessoes).filter(
            RecebimentoSessoes.recebimento_item_id == item.id,
            RecebimentoSessoes.numero_sessao == item.tentativas
        ).first()

        if sessao:
            # Busca todas as UAs únicas vinculadas a este item nesta tentativa (sessão)
            ua_codes = db.query(RecebimentoLeitura.ua).filter(
                RecebimentoLeitura.recebimento_item_id == item.id,
                RecebimentoLeitura.sessao_id == sessao.id
            ).distinct().all()
            
            ua_codes_list = [ua[0] for ua in ua_codes if ua[0]]

            if ua_codes_list:
                db.query(UA).filter(UA.ua.in_(ua_codes_list)).update(
                    {"status": "Em Análise"},
                    synchronize_session=False
                )
                db.commit() # Garante a persistência dos status das UAs

        # 5. Verifica se o romaneio pai pode ser atualizado (se todos os itens estão concluídos)
        RecebimentoService.atualizar_status_pos_conferencia(db, item.recebimento_id)
        
        return item

    @staticmethod
    def registrar_leitura(db: Session, item_id: int, leit: any, usuario: str):
        from app.models.recebimento import RecebimentoLeitura, RecebimentoItem, RecebimentoSessoes
        from app.models.ua import UA
        from app.models.unidade_produto import UnidadeProduto
        from app.models.unidade_medida import UnidadeMedida

        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()
        if not item:
            raise ValueError("Item não encontrado.")

        # Validação de segurança: se já houver um conferente atribuído, apenas ele pode bipar
        if item.recebimento and item.recebimento.status == StatusRecebimento.EM_CONFERENCIA.value:
            if item.recebimento.conferente and item.recebimento.conferente != usuario:
                raise ValueError(f"Este romaneio está sendo conferido por {item.recebimento.conferente}. Você não pode registrar leituras nele.")


        # Validação de Lote e Validade respeitando a cadeia de herança:
        # Produto (exceção) → Família → Parâmetros Globais
        produto = item.produto
        familia = produto.familia_relacao if produto else None
        
        # Carrega parâmetros globais como fallback final
        from app.models.parametros_mestres import ParametrosMestres
        params_globais = db.query(ParametrosMestres).first()

        def resolve_param(attr_produto, attr_familia, attr_global, default=None):
            """Resolve um parâmetro pela cadeia Produto → Família → Global."""
            # 1. Exceção no produto (se não for None, o produto sobrescreveu)
            val = getattr(produto, attr_produto, None) if produto else None
            if val is not None:
                return val
            # 2. Regra na família
            val = getattr(familia, attr_familia, None) if familia else None
            if val is not None:
                return val
            # 3. Parâmetro global
            val = getattr(params_globais, attr_global, None) if params_globais else None
            if val is not None:
                return val
            return default

        # tipo_validade: "sem_validade", "opcional" ou "obrigatoria"
        # Resolve apenas na cadeia Produto → Família (sem global, pois global usa campo booleano)
        tipo_validade_produto = getattr(produto, 'tipo_validade', None) if produto else None
        tipo_validade_familia = getattr(familia, 'tipo_validade', None) if familia else None
        tipo_validade = tipo_validade_produto or tipo_validade_familia  # Primeiro não-None

        if tipo_validade == 'sem_validade':
            # Produto/Família explicitamente declaram que não tem validade
            # Global NÃO pode sobrescrever isso
            validade_obrigatoria = False
            bloquear_sem_validade = False
        elif tipo_validade == 'obrigatoria':
            validade_obrigatoria = True
            bloquear_sem_validade = True
        elif tipo_validade == 'opcional':
            validade_obrigatoria = False
            bloquear_sem_validade = resolve_param('bloquear_sem_validade', 'bloquear_sem_validade', 'bloquear_sem_validade', False)
        else:
            # Nenhum nível definiu tipo_validade, usa parâmetros globais
            global_obrigatoria = getattr(params_globais, 'validade_obrigatoria', False) if params_globais else False
            validade_obrigatoria = global_obrigatoria
            bloquear_sem_validade = resolve_param('bloquear_sem_validade', 'bloquear_sem_validade', 'bloquear_sem_validade', False)

        lote_obrigatorio = resolve_param('lote_obrigatorio', 'lote_obrigatorio', 'lote_obrigatorio', False)
        bloquear_sem_lote = resolve_param('bloquear_sem_lote', 'bloquear_sem_lote', 'bloquear_sem_lote', False)

        if (lote_obrigatorio or bloquear_sem_lote) and (not leit.lote or not leit.lote.strip()):
            raise ValueError(f"Lote é obrigatório.")
        
        if (validade_obrigatoria or bloquear_sem_validade) and (not leit.data_validade or not leit.data_validade.strip()):
            raise ValueError(f"Data de validade é obrigatória.")



        if leit.ean:
            unidade_ean = db.query(UnidadeProduto).filter(
                UnidadeProduto.produto_id == item.sku,
                UnidadeProduto.ean == leit.ean
            ).first()
            if not unidade_ean:
                raise ValueError(f"O GTIN {leit.ean} não corresponde ao produto.")
        elif not leit.descricao_visual or not leit.descricao_visual.strip():
            raise ValueError(f"Para itens sem código de barras, a descrição visual é obrigatória.")

        # Garante que existe uma sessão ativa (Sync com item.tentativas)
        sessao = db.query(RecebimentoSessoes).filter(
            RecebimentoSessoes.recebimento_item_id == item_id,
            RecebimentoSessoes.numero_sessao == item.tentativas
        ).first()

        if not sessao:
            sessao = RecebimentoSessoes(
                recebimento_item_id=item_id,
                numero_sessao=item.tentativas or 1,
                criado_por=usuario,
                motivo=None
            )
            if not item.tentativas:
                item.tentativas = 1
            db.add(sessao)
            db.flush()

        # Prepara a data de validade
        data_val = None
        if leit.data_validade and isinstance(leit.data_validade, str) and leit.data_validade.strip():
            try:
                data_val = datetime.strptime(leit.data_validade.strip(), "%d/%m/%Y")
            except (ValueError, TypeError):
                raise ValueError(f"Data de validade inválida. Use DD/MM/AAAA.")

        # Busca se já existe uma leitura para esta UA nesta mesma sessão (para evitar duplicação em edições)
        # Filtramos por qtd > 0 para não sobrescrever estornos, se existirem
        leitura_existente = db.query(RecebimentoLeitura).filter(
            RecebimentoLeitura.recebimento_item_id == item_id,
            RecebimentoLeitura.sessao_id == sessao.id,
            RecebimentoLeitura.ua == leit.ua,
            RecebimentoLeitura.qtd > 0
        ).first()

        if leitura_existente:
            # Atualiza a leitura anterior em vez de criar uma nova (Log de rascunho de sessão)
            leitura_existente.qtd = leit.quantidade
            leitura_existente.und = leit.und
            leitura_existente.ean = leit.ean
            leitura_existente.lote = leit.lote
            leitura_existente.data_validade = data_val
            leitura_existente.fator_conversao = leit.fator_conversao
            leitura_existente.unidade_produto_id = leit.unidade_produto_id
            leitura_existente.descricao_visual = leit.descricao_visual
            leitura_existente.int_embalagem = leit.int_embalagem
            leitura_existente.int_material = leit.int_material
            leitura_existente.identificacao = leit.identificacao
            leitura_existente.cert_qual = leit.cert_qual
            leitura_existente.usuario = usuario
            leitura_existente.data = datetime.now()
            nova_leitura = leitura_existente
        else:
            # Cria uma nova Leitura
            nova_leitura = RecebimentoLeitura(
                recebimento_item_id=item_id,
                qtd=leit.quantidade,
                und=leit.und,
                ean=leit.ean,
                lote=leit.lote,
                data_validade=data_val,
                fator_conversao=leit.fator_conversao,
                unidade_produto_id=leit.unidade_produto_id,
                descricao_visual=leit.descricao_visual,
                usuario=usuario,
                ua=leit.ua,
                sessao_id=sessao.id,
                int_embalagem=leit.int_embalagem,
                int_material=leit.int_material,
                identificacao=leit.identificacao,
                cert_qual=leit.cert_qual
            )
            db.add(nova_leitura)

        # Upsert da UA
        filial_id = item.destino_id or 1
        ua_existente = db.query(UA).filter(UA.ua == leit.ua).first()
        if ua_existente:
            if ua_existente.status == "ESTORNADA":
                raise ValueError(f"A UA {leit.ua} foi estornada e não pode ser reutilizada. Utilize uma nova etiqueta.")
            
            ua_existente.produto_id = item.sku
            ua_existente.lote = leit.lote
            ua_existente.data_validade = data_val
            ua_existente.quantidade = leit.quantidade
            ua_existente.unidade_produto_id = leit.unidade_produto_id
            ua_existente.fator_conversao = leit.fator_conversao
            ua_existente.status = "Em Conferência"
            ua_existente.descricao_visual = leit.descricao_visual
            ua_existente.atualizado_por = usuario

            # Regra de Qualidade Automática
            if leit.int_material == "Não":
                ua_existente.estado = "Ruim"
                ua_existente.observacoes = "Material avariado"
            else:
                ua_existente.estado = "Bom"
        else:
            nova_ua = UA(
                ua=leit.ua,
                filial_id=filial_id,
                produto_id=item.sku,
                lote=leit.lote,
                data_validade=data_val,
                quantidade=leit.quantidade,
                unidade_produto_id=leit.unidade_produto_id,
                fator_conversao=leit.fator_conversao,
                status="Em Conferência",
                estado="Ruim" if leit.int_material == "Não" else "Bom",
                observacoes="Material avariado" if leit.int_material == "Não" else None,
                descricao_visual=leit.descricao_visual,
                criado_por=usuario
            )
            db.add(nova_ua)

        db.flush()
        # Recalcula qtd_recebida do item
        RecebimentoService._recalcular_qtd_item(db, item)
        db.commit()
        return nova_leitura

    @staticmethod
    def estornar_leitura(db: Session, item_id: int, ua_codigo: str, usuario: str):
        from app.models.recebimento import RecebimentoLeitura, RecebimentoItem, RecebimentoSessoes
        from app.models.ua import UA

        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()
        if not item:
            raise ValueError("Item não encontrado.")

        # Busca a última leitura positiva desta UA para estornar
        ultima_leitura = db.query(RecebimentoLeitura).filter(
            RecebimentoLeitura.recebimento_item_id == item_id,
            RecebimentoLeitura.ua == ua_codigo,
            RecebimentoLeitura.qtd > 0
        ).order_by(RecebimentoLeitura.data.desc()).first()

        if not ultima_leitura:
            raise ValueError("Nenhuma leitura encontrada para esta UA.")

        # Busca sessão ativa
        sessao = db.query(RecebimentoSessoes).filter(
            RecebimentoSessoes.recebimento_item_id == item_id,
            RecebimentoSessoes.numero_sessao == item.tentativas
        ).first()

        # Cria a leitura negativa (Estorno para auditoria)
        estorno = RecebimentoLeitura(
            recebimento_item_id=item_id,
            qtd=-ultima_leitura.qtd,
            und=ultima_leitura.und,
            ean=ultima_leitura.ean,
            lote=ultima_leitura.lote,
            data_validade=ultima_leitura.data_validade,
            fator_conversao=ultima_leitura.fator_conversao,
            unidade_produto_id=ultima_leitura.unidade_produto_id,
            descricao_visual=ultima_leitura.descricao_visual,
            usuario=usuario,
            ua=ua_codigo,
            sessao_id=sessao.id if sessao else ultima_leitura.sessao_id,
            int_embalagem=ultima_leitura.int_embalagem,
            int_material=ultima_leitura.int_material,
            identificacao=ultima_leitura.identificacao,
            cert_qual=ultima_leitura.cert_qual
        )
        db.add(estorno)

        # Soft delete da UA física (Estorno) em vez de exclusão física
        ua_obj = db.query(UA).filter(UA.ua == ua_codigo).first()
        if ua_obj:
            ua_obj.status = "ESTORNADA"
            
            # Log de estorno manual no histórico da UA
            from app.models.historico_ua import HistoricoUA
            hist = HistoricoUA(
                ua_id=ua_obj.id,
                tipo_acao="ESTORNO_MANUAL",
                observacoes=f"Estorno manual solicitado pelo conferente {usuario}",
                criado_por=usuario
            )
            db.add(hist)

        db.flush()
        # Recalcula qtd_recebida do item
        RecebimentoService._recalcular_qtd_item(db, item)
        db.commit()
        return estorno

    @staticmethod
    def _recalcular_qtd_item(db: Session, item: RecebimentoItem):
        from app.models.recebimento import RecebimentoLeitura, RecebimentoSessoes
        from app.models.unidade_medida import UnidadeMedida
        from app.models.unidade_produto import UnidadeProduto

        # Busca a ÚLTIMA sessão disponível para este item
        # Isso evita que o contador de tentativas (que sobe no frontend em caso de erro)
        # mascare os dados de leituras gravados nas sessões iniciais.
        sessao_ativa = db.query(RecebimentoSessoes).filter(
            RecebimentoSessoes.recebimento_item_id == item.id
        ).order_by(RecebimentoSessoes.numero_sessao.desc()).first()

        if not sessao_ativa:
            # Se nunca houve bipe, a quantidade é 0
            # Mas vamos validar se deletamos ou mantemos (por segurança, se não há bipes, é 0)
            if item.qtd_recebida != 0:
                item.qtd_recebida = 0.0
                db.add(item)
            return

        # Somar as leituras de todas as sessões do item
        # filtrando UAs que foram estornadas (rejeitadas na conclusão ou canceladas no passado)
        from app.models.ua import UA
        
        leituras = db.query(RecebimentoLeitura).select_from(RecebimentoLeitura).outerjoin(
            UA, RecebimentoLeitura.ua == UA.ua
        ).filter(
            RecebimentoLeitura.recebimento_item_id == item.id,
            (UA.status != "ESTORNADA") | (UA.ua == None)
        ).all()
        total_base = sum(l.qtd * (l.fator_conversao or 1.0) for l in leituras)
        
        fator_nota = 1.0
        und_medida_nota = db.query(UnidadeMedida).filter(UnidadeMedida.sigla.ilike(item.und)).first()
        if und_medida_nota:
            up_nota = db.query(UnidadeProduto).filter(
                UnidadeProduto.produto_id == item.sku,
                UnidadeProduto.unidade_medida_id == und_medida_nota.id
            ).first()
            if up_nota:
                fator_nota = up_nota.fator_conversao
        
        item.qtd_recebida = round(total_base / (fator_nota if fator_nota > 0 else 1.0), 4)
        db.add(item)

    @staticmethod
    def atualizar_status_pos_conferencia(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            return
        
        itens = recebimento.itens
        concluidos = [StatusRecebimentoItem.CONFERIDO.value, StatusRecebimentoItem.DIVERGENTE.value]
        
        # Se todos os itens estão conferidos ou divergentes
        if all(it.status in concluidos for it in itens):
            # O Romaneio vai para EM_ANALISE para o fiscal decidir
            recebimento.status = StatusRecebimento.EM_ANALISE.value
            db.commit()

    @staticmethod
    def rejeitar_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.rejeitar()
            recebimento.conclusao = datetime.now()
        except Exception as e:
            raise ValueError("Não é possível rejeitar um romaneio concluído ou já finalizado.")

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def concluir_doca(db: Session, recebimento_id: int, uas_rejeitadas: List[str] = [], itens_rejeitados: List[int] = [], resolucoes_sobra: dict = {}, is_parcial: bool = False):
        from app.models.recebimento import Recebimento, RecebimentoItem, RecebimentoLeitura, RecebimentoSessoes
        from app.models.ua import UA
        from app.models.historico_ua import HistoricoUA
        from app.models.unidade_medida import UnidadeMedida
        from app.models.unidade_produto import UnidadeProduto

        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        novas_uas_geradas = []

        # 1. Identifica todas as UAs a serem rejeitadas (Divergência de Falta ou Avaria grave marcada no modal)
        rejeitadas_set = set(uas_rejeitadas)
        
        # Se algum item foi rejeitado inteiramente, adiciona as suas UAs à lista de rejeição
        if itens_rejeitados:
            leituras_itens_rejeitados = db.query(RecebimentoLeitura).filter(
                RecebimentoLeitura.recebimento_item_id.in_(itens_rejeitados)
            ).all()
            for l in leituras_itens_rejeitados:
                if l.ua:
                    rejeitadas_set.add(l.ua)

        # 2. Processa todas as UAs vinculadas a este romaneio para Estornar as rejeitadas
        leituras_romaneio = db.query(RecebimentoLeitura).join(RecebimentoItem).filter(
            RecebimentoItem.recebimento_id == recebimento_id
        ).all()
        
        codigos_ua_romaneio = list(set([l.ua for l in leituras_romaneio if l.ua]))
        
        if codigos_ua_romaneio:
            uas_fisicas = db.query(UA).filter(UA.ua.in_(codigos_ua_romaneio)).all()
            
            for ua in uas_fisicas:
                if ua.ua in rejeitadas_set:
                    ua.status = "ESTORNADA"
                    hist = HistoricoUA(
                        ua_id=ua.id,
                        tipo_acao="REJEICAO_NA_CONCLUSAO",
                        observacoes="Rejeitado pelo usuário durante a conclusão do recebimento (Gestão por Exceção).",
                        criado_por=recebimento.conferente or "Sistema"
                    )
                    db.add(hist)
                else:
                    # UAs aceitas vão para o estoque aguardando armazenamento (se não foram bloqueadas acima)
                    # Colocamos pendente de armazenamento, que pode ser sobrescrito se houver bloqueio/estorno de sobra
                    if ua.status not in ["ESTORNADA", "Bloqueada"]:
                        ua.status = "Aguardando Armazenamento"

        # 3. Força a sincronização e RECALCULA antes da gestão de sobras, para abater as rejeições!
        db.flush()

        for item in recebimento.itens:
            RecebimentoService._recalcular_qtd_item(db, item)

        # As quantidades recebidas (item.qtd_recebida) agora refletem apenas o que não foi sumariamente rejeitado.

        # 4. Processa resoluções de sobra nas UAs aceitas
        for item_id_str, resolucao in resolucoes_sobra.items():
            item_id = int(item_id_str)
            item = next((i for i in recebimento.itens if i.id == item_id), None)
            if not item:
                continue

            # Só processa se houver sobra real ATUALIZADA (ignorando arredondamento)
            if (item.qtd_recebida or 0) <= item.qtd_nota + 0.0001:
                continue

            # Busca o fator da nota para conversão para base
            fator_nota = 1.0
            und_medida_nota = db.query(UnidadeMedida).filter(UnidadeMedida.sigla.ilike(item.und)).first()
            if und_medida_nota:
                up_nota = db.query(UnidadeProduto).filter(
                    UnidadeProduto.produto_id == item.sku,
                    UnidadeProduto.unidade_medida_id == und_medida_nota.id
                ).first()
                if up_nota:
                    fator_nota = up_nota.fator_conversao

            # Excess em unidade base
            excesso_base = (item.qtd_recebida - item.qtd_nota) * fator_nota

            # Busca as UAs deste item na última sessão
            sessao_ativa = db.query(RecebimentoSessoes).filter(
                RecebimentoSessoes.recebimento_item_id == item.id
            ).order_by(RecebimentoSessoes.numero_sessao.desc()).first()

            if not sessao_ativa:
                 continue

            codigos_ua_item = db.query(RecebimentoLeitura.ua).filter(
                RecebimentoLeitura.recebimento_item_id == item.id,
                RecebimentoLeitura.sessao_id == sessao_ativa.id,
                RecebimentoLeitura.ua != None
            ).distinct().all()
            ua_codes = [c[0] for c in codigos_ua_item]

            # UAs físicas (apenas as que NÃO FORAM rejeitadas/estornadas no passo 2)
            uas_fisicas_item = db.query(UA).filter(
                UA.ua.in_(ua_codes),
                UA.status != "ESTORNADA"
            ).order_by(UA.id.desc()).all()

            for ua in uas_fisicas_item:
                if excesso_base <= 0:
                    break
                
                ua_base_qty = ua.quantidade * (ua.fator_conversao or 1.0)
                reducao_base = min(ua_base_qty, excesso_base)

                ultima_leitura = db.query(RecebimentoLeitura).filter(
                    RecebimentoLeitura.recebimento_item_id == item.id,
                    RecebimentoLeitura.ua == ua.ua,
                    RecebimentoLeitura.sessao_id == sessao_ativa.id,
                    RecebimentoLeitura.qtd > 0
                ).first()

                if resolucao == 'ACEITAR_EXCESSO':
                    db.add(HistoricoUA(
                        ua_id=ua.id,
                        tipo_acao="ACEITACAO_SOBRA",
                        observacoes=f"Excedente à nota fiscal aceito pelo conferente e liberado para uso. (Saldo sobra: {excesso_base/fator_nota:.2f} {item.und})",
                        criado_por=recebimento.conferente or "Sistema"
                    ))
                    excesso_base -= reducao_base

                elif resolucao == 'ESTORNAR_EXCESSO':
                    if reducao_base >= ua_base_qty - 0.0001:
                        # Estorna a UA inteira
                        ua.status = "ESTORNADA"
                        excesso_base -= ua_base_qty
                    else:
                        # Split: reduz a original e cria uma nova estornada
                        nova_qtd_orig = (ua_base_qty - reducao_base) / (ua.fator_conversao or 1.0)
                        ua.quantidade = round(nova_qtd_orig, 4)
                        
                        nova_ua_code = RecebimentoService._gerar_proxima_ua(db)
                        nova_ua = UA(
                            ua=nova_ua_code,
                            filial_id=ua.filial_id,
                            produto_id=ua.produto_id,
                            lote=ua.lote,
                            data_validade=ua.data_validade,
                            quantidade=round(reducao_base / (ua.fator_conversao or 1.0), 4),
                            unidade_produto_id=ua.unidade_produto_id,
                            fator_conversao=ua.fator_conversao,
                            status="ESTORNADA",
                            estado=ua.estado,
                            observacoes="Sobra estornada fisicamente (Split)",
                            criado_por=recebimento.conferente or "Sistema"
                        )
                        db.add(nova_ua)
                        novas_uas_geradas.append(nova_ua_code)
                        excesso_base -= reducao_base
                    
                    db.add(HistoricoUA(
                        ua_id=ua.id,
                        tipo_acao="ESTORNO_SOBRA",
                        observacoes="UA processada por ser excedente à nota fiscal.",
                        criado_por=recebimento.conferente or "Sistema"
                    ))
                    
                    # Inserir leitura compensatória para ESTORNO
                    if ultima_leitura:
                        qtd_estornar = reducao_base / (ultima_leitura.fator_conversao or 1.0)
                        RecebimentoService._inserir_leitura_compensatoria(db, item, ua, sessao_ativa, ultima_leitura, qtd_estornar, recebimento.conferente)

        # 5. Após estornos/truncamentos de sobra, recalcula DINOVO as quantidades para refletir os ajustes físicos
        db.flush()
        for item in recebimento.itens:
            RecebimentoService._recalcular_qtd_item(db, item)

        # 6. Finaliza o Romaneio via FSM
        fsm = RecebimentoFSM(recebimento)
        try:
            if is_parcial:
                recebimento.concluir_parcial()
                
                # Liberação física das UAs prontas APENAS dessa fase (já aprovadas/sincronizadas)
                uas_aceitas = db.query(UA).join(
                    RecebimentoLeitura, UA.ua == RecebimentoLeitura.ua
                ).join(
                    RecebimentoItem, RecebimentoLeitura.recebimento_item_id == RecebimentoItem.id
                ).filter(
                    RecebimentoItem.recebimento_id == recebimento_id,
                    UA.status.in_(["Em Conferência", "Em Análise"])
                ).all()

                for ua in uas_aceitas:
                    ua.status = "Aguardando Armazenamento"
            else:
                recebimento.concluir()
                recebimento.conclusao = datetime.now()
        except Exception as e:
            raise ValueError(f"Não foi possível concluir o romaneio: {str(e)}")

        db.commit()
        db.refresh(recebimento)
        return {"recebimento": recebimento, "novas_uas": novas_uas_geradas}

    @staticmethod
    def _inserir_leitura_compensatoria(db, item, ua, sessao_ativa, ultima_leitura, qtd_estornar, conferente):
        from app.models.recebimento import RecebimentoLeitura
        estorno = RecebimentoLeitura(
            recebimento_item_id=item.id,
            qtd=-qtd_estornar,
            und=ultima_leitura.und,
            ean=ultima_leitura.ean,
            lote=ultima_leitura.lote,
            data_validade=ultima_leitura.data_validade,
            fator_conversao=ultima_leitura.fator_conversao,
            unidade_produto_id=ultima_leitura.unidade_produto_id,
            descricao_visual=ultima_leitura.descricao_visual,
            usuario=conferente or "Sistema",
            ua=ua.ua,
            sessao_id=sessao_ativa.id,
            int_embalagem=ultima_leitura.int_embalagem,
            int_material=ultima_leitura.int_material,
            identificacao=ultima_leitura.identificacao,
            cert_qual=ultima_leitura.cert_qual
        )
        db.add(estorno)



    @staticmethod
    def finalizar_recebimento_fiscal(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if recebimento.status != StatusRecebimento.EM_ANALISE.value:
            raise ValueError("O romaneio precisa ser concluído na doca e estar em análise para ser finalizado.")

        # Aqui no futuro entrará a lógica de gerar o stock (criar as UAs físicas)
        # Liberação das UAs que ficaram em análise durante a conferência
        from app.models.recebimento import RecebimentoItem, RecebimentoLeitura
        from app.models.ua import UA

        uas_para_liberar = db.query(UA).join(
            RecebimentoLeitura, UA.ua == RecebimentoLeitura.ua
        ).join(
            RecebimentoItem, RecebimentoLeitura.recebimento_item_id == RecebimentoItem.id
        ).filter(
            RecebimentoItem.recebimento_id == recebimento_id,
            UA.status.in_(["Em Conferência", "Em Análise"])
        ).all()

        for ua in uas_para_liberar:
            ua.status = "Aguardando Armazenamento"

        recebimento.status = StatusRecebimento.FINALIZADO.value
        recebimento.conclusao = datetime.now()
        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def vincular_oc(db_wms: Session, db_erp: Session, recebimento_id: int, oc: str):
        recebimento = db_wms.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        status_permitidos_para_edicao = ['IMPORTADO', 'PENDENTE', 'BLOQUEADO', 'AGUARDANDO_LIBERACAO', 'DIVERGENTE']
        if recebimento.status not in status_permitidos_para_edicao:
            raise ValueError(f"Não é possível editar a OC. A conferência já foi iniciada ou está na fila. Cancele a liberação antes.")

        # Vai na tabela do ERP verificar se a OC existe
        query_erp = text("SELECT 1 FROM PedidosCompra WITH (NOLOCK) WHERE NumeroOC = :oc")
        resultado_erp = db_erp.execute(query_erp, {"oc": oc}).first()

        if not resultado_erp:
            raise ValueError(f"A OC {oc} não foi encontrada no ERP.")

        # Se a query retornou algo, a OC existe! Então vinculamos:
        recebimento.oc = oc
        
        fsm = RecebimentoFSM(recebimento)
        if recebimento.status == 'BLOQUEADO':
            recebimento.desbloquear()
        
        db_wms.commit()
        db_wms.refresh(recebimento)

        # VALIDAÇÃO DE PREÇO (Após vincular OC)
        RecebimentoService._validar_divergencia_precos(db_wms, db_erp, recebimento_id)
        
        # Pode estar pronto para liberar agora
        return RecebimentoService.atualizar_status_pai(db_wms, recebimento_id)

    @staticmethod
    def sincronizar_ocs_pendentes(db_wms: Session, db_erp: Session):
        # Busca romaneios sem OC vinculada
        recebimentos_sem_oc = db_wms.query(Recebimento).filter(Recebimento.oc == None).all()
        atualizados = 0

        for rec in recebimentos_sem_oc:
            # Olha no histórico qual era a tag XML original vinculada à NFe
            historico = db_wms.query(HistoricoXML).filter(HistoricoXML.nfe == rec.nfe).first()

            if historico and historico.xped_original:
                # Vai no ERP procurar a OC original usando a tabela de PedidosCompra
                query_erp = text("SELECT 1 FROM PedidosCompra WITH (NOLOCK) WHERE NumeroOC = :oc")
                resultado_erp = db_erp.execute(query_erp, {"oc": historico.xped_original}).first()

                if resultado_erp:
                    rec.oc = historico.xped_original
                    # Força a revalidação de preços agora que temos a OC
                    RecebimentoService._validar_divergencia_precos(db_wms, db_erp, rec.id)
                    atualizados += 1

        if atualizados > 0:
            db_wms.commit()

        return {"atualizados": atualizados}

    @staticmethod
    def vincular_unidade_pendente(db: Session, recebimento_id: int, unidade_externa: str, unidade_medida_id: int):
        # Verifica se o vínculo já existe globalmente
        existente = db.query(VinculoUnidade).filter(
            VinculoUnidade.unidade_externa == unidade_externa.upper()
        ).first()

        # Se não existir, cria o vínculo na tabela global para futuros xmls
        if not existente:
            novo_vinculo = VinculoUnidade(
                unidade_externa=unidade_externa.upper(),
                unidade_medida_id=unidade_medida_id
            )
            db.add(novo_vinculo)
            db.flush()

        # Como criamos o vínculo global acima, basta commitar.
        # O recalculo delegará a avaliação das unidades pendentes na próxima linha.
        db.commit()

        from app.db.database import SessionLocalERP
        db_erp = SessionLocalERP()
        try:
            RecebimentoService._validar_divergencia_precos(db, db_erp, recebimento_id)
        finally:
            db_erp.close()

        # Aciona o motor central que recalcula itens e cabeçalho
        return RecebimentoService.atualizar_status_pai(db, recebimento_id)

    @staticmethod
    def vincular_sku_pendente(db: Session, recebimento_id: int, item_id: int, produto_id: int, criado_por: str = None):
        rec = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()

        if not rec or not item:
            raise ValueError("Recebimento ou Item não encontrado.")

        historico = db.query(HistoricoXML).filter(HistoricoXML.nfe == rec.nfe).first()
        if not historico:
            raise ValueError("Histórico da NFe não encontrado para extrair o CNPJ do emissor.")
        
        cnpj = historico.cnpj_emitente

        # O vínculo é baseado estritamente no código do fornecedor enviado na NF
        codigo_do_forn = item.codigo_fornecedor
        
        if not codigo_do_forn:
            # Se não há código, não podemos criar um vínculo persistente na tabela VinculosProdutoFornecedor
            # Mas ainda podemos atualizar o SKU deste item específico e de outros itens idênticos na mesma situação
            existente = None
        else:
            existente = db.query(VinculoProdutoFornecedor).filter(
                VinculoProdutoFornecedor.cnpj_fornecedor == cnpj,
                VinculoProdutoFornecedor.codigo_fornecedor == codigo_do_forn
            ).first()

        if codigo_do_forn and not existente:
            novo_vinculo = VinculoProdutoFornecedor(
                cnpj_fornecedor=cnpj,
                codigo_fornecedor=codigo_do_forn,
                produto_id=produto_id,
                criado_por=criado_por
            )
            db.add(novo_vinculo)
            db.flush()
        elif existente:
            existente.produto_id = produto_id
            if criado_por:
                existente.criado_por = criado_por

        # Encontrar todas as NFes do fornecedor com esse CNPJ para atualizar outras notas pendentes
        historicos_forn = db.query(HistoricoXML.nfe).filter(HistoricoXML.cnpj_emitente == cnpj).all()
        nfes_forn = [h[0] for h in historicos_forn]
        
        recebimentos_ids = []
        if nfes_forn:
            recs = db.query(Recebimento.id).filter(
                Recebimento.nfe.in_(nfes_forn),
                Recebimento.status.in_([
                    StatusRecebimento.IMPORTADO.value, 
                    StatusRecebimento.BLOQUEADO.value, 
                    StatusRecebimento.AGUARDANDO_LIBERACAO.value,
                    StatusRecebimento.PENDENTE.value
                ])
            ).all()
            recebimentos_ids = [r[0] for r in recs]

        # Puxa o objeto produto para buscar a descrição real
        from app.models.produto import Produto
        prod = db.query(Produto).filter(Produto.id == produto_id).first()
        descricao_prod = prod.descricao if prod else "Descrição não encontrada"

        recebimentos_afetados = set()
        
        # Atualiza os itens do mesmo produto nesta nota e em outras notas pendentes do mesmo fornecedor
        if recebimentos_ids:
            itens_pendentes = db.query(RecebimentoItem).filter(
                RecebimentoItem.recebimento_id.in_(recebimentos_ids),
                RecebimentoItem.codigo_fornecedor == item.codigo_fornecedor,
                RecebimentoItem.status == StatusRecebimentoItem.PENDENTE_VINCULO.value,
                RecebimentoItem.id != item_id
            ).all()

            for it_pend in itens_pendentes:
                it_pend.sku = produto_id
                it_pend.descricao = descricao_prod
                
                # Sempre adicionamos aos afetados para garantir recálculo do status pai
                recebimentos_afetados.add(it_pend.recebimento_id)

        # Força atualização do item clicado
        item.sku = produto_id
        item.descricao = descricao_prod

        db.commit()
        
        from app.db.database import SessionLocalERP
        db_erp = SessionLocalERP()
        try:
            # Valida os preços para as notas afetadas antes de atualizar o status pai
            for rec_id in recebimentos_afetados:
                RecebimentoService._validar_divergencia_precos(db, db_erp, rec_id)
                if rec_id != recebimento_id:
                    RecebimentoService.atualizar_status_pai(db, rec_id)
            
            # Garante que a nota clicada também seja validada
            if recebimento_id not in recebimentos_afetados:
                RecebimentoService._validar_divergencia_precos(db, db_erp, recebimento_id)
        finally:
            db_erp.close()

        # Atualiza a nota clicada e a devolve pra tela
        return RecebimentoService.atualizar_status_pai(db, recebimento_id)

    @staticmethod
    def sugerir_vinculo_sku(db_wms: Session, db_erp: Session, recebimento_id: int, item_id: int):
        rec = db_wms.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        item = db_wms.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()

        if not rec or not item:
            return {"sugestao": None, "mensagem": "Recebimento ou Item não encontrado."}

        # 1. Verificar se há pendência de unidade
        unidade_interna_direta = db_wms.query(UnidadeMedida).filter(UnidadeMedida.sigla == item.und).first()
        vinculo_und = None
        if not unidade_interna_direta:
            vinculo_und = db_wms.query(VinculoUnidade).filter(VinculoUnidade.unidade_externa == item.und).first()

        unidade_resolvida = unidade_interna_direta or vinculo_und
        
        if not unidade_resolvida:
            return {"sugestao": None, "mensagem": "Unidade pendente"}

        id_und_wms = unidade_interna_direta.id if unidade_interna_direta else vinculo_und.unidade_medida_id

        # 2. Verificar se tem OC
        if not rec.oc:
            return {"sugestao": None, "mensagem": "Sem OC vinculada."}

        # 3. Buscar OC no ERP
        query_erp = text("SELECT * FROM PedidosCompraItens WITH (NOLOCK) WHERE NumeroOC = :oc")
        itens_oc = db_erp.execute(query_erp, {"oc": rec.oc}).mappings().all()

        if not itens_oc:
            return {"sugestao": None, "mensagem": "OC não encontrada ou sem itens."}

        from app.models.produto import Produto
        from app.models.unidade_produto import UnidadeProduto

        candidatos = []

        for item_oc in itens_oc:
            prod = db_wms.query(Produto).filter(Produto.sku == str(item_oc["Sku"])).first()
            if not prod:
                continue

            und_erp_str = str(item_oc["Und"]).upper()
            und_medida_oc = db_wms.query(UnidadeMedida).filter(UnidadeMedida.sigla == und_erp_str).first()
            
            fator_conversao_erp = 1.0
            if und_medida_oc:
                prod_und_erp = db_wms.query(UnidadeProduto).filter(
                    UnidadeProduto.produto_id == prod.id,
                    UnidadeProduto.unidade_medida_id == und_medida_oc.id
                ).first()
                if prod_und_erp:
                    fator_conversao_erp = prod_und_erp.fator_conversao
                
            fator_conversao_xml = 1.0
            prod_und_xml = db_wms.query(UnidadeProduto).filter(
                UnidadeProduto.produto_id == prod.id,
                UnidadeProduto.unidade_medida_id == id_und_wms
            ).first()

            if prod_und_xml:
                fator_conversao_xml = prod_und_xml.fator_conversao
            else:
                return {"sugestao": None, "mensagem": "Unidade pendente"}
            
            fator_relativo = fator_conversao_erp / fator_conversao_xml
            
            qtd_oc = float(item_oc["Qtd"])
            qtd_recebida_oc = float(item_oc.get("QtdRecebida", 0))
            saldo_esperado_oc = qtd_oc - qtd_recebida_oc
            
            qtd_esperada_xml = saldo_esperado_oc * fator_relativo
            preco_esperado_xml = float(item_oc["PrecoUnitario"]) / fator_relativo

            val_unitario_xml = float(item.valor_unitario or 0.0)

            # Margem de tolerância
            margem = 0.01

            match_qtd = abs(float(item.qtd_nota) - qtd_esperada_xml) <= margem
            match_preco = abs(val_unitario_xml - preco_esperado_xml) <= margem

            if len(itens_oc) == 1 or (match_qtd and match_preco):
                candidatos.append({
                    "produto": prod,
                    "item_oc_desc": item_oc["Descricao"]
                })

        if not candidatos:
            return {"sugestao": None, "mensagem": "Nenhum item compatível verificado no ERP."}

        if len(candidatos) == 1:
            sug_prod = candidatos[0]["produto"]
            if len(itens_oc) == 1:
                return {"sugestao": {"id": sug_prod.id, "sku": sug_prod.sku, "descricao": sug_prod.descricao}, "mensagem": "Sugestão: OC com item único"}
            else:
                return {"sugestao": {"id": sug_prod.id, "sku": sug_prod.sku, "descricao": sug_prod.descricao}, "mensagem": "Sugestão: item com quantidade e preços correspondentes."}

        return {"sugestao": None, "mensagem": "Múltiplos itens compatíveis."}

    @staticmethod
    def _gerar_proxima_ua(db: Session):
        from sqlalchemy import func
        from app.models.ua import UA
        
        # Busca a maior UA que comece com 'UA' e tenha apenas dígitos depois das letras
        max_ua = db.query(func.max(UA.ua)).filter(UA.ua.like('UA%')).scalar()
        
        if not max_ua:
            return "UA0000001"
        
        try:
            # Extrai o número (ex: UA0000123 -> 123)
            num_str = max_ua[2:]
            num = int(num_str)
            proximo_num = num + 1
            return f"UA{proximo_num:07d}"
        except (ValueError, IndexError):
            # Fallback se o formato estiver estranho
            return "UA0000001"
