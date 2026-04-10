from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from ..models.recebimento import Recebimento, RecebimentoItem
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

            novo_item = RecebimentoItem(
                recebimento_id=db_receb.id,
                descricao=descricao_final,
                qtd_nota=item_dados.qtd_nota,
                valor_unitario=item_dados.valor_unitario,
                und=item_dados.und,
                codigo_fornecedor=item_dados.codigo_fornecedor,
                sku=sku_encontrado,
                status=status_item
            )
            db.add(novo_item)

        db.commit()
        db.refresh(db_receb)

        # 3. Roda a máquina de estados para atualizar o status do Romaneio
        return RecebimentoService.atualizar_status_pai(db, db_receb.id)

    @staticmethod
    def atualizar_status_pai(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            return None

        # Se já passou da fase de libertação, as mudanças são manuais, não mexe.
        status_avancados = [StatusRecebimento.AGUARDANDO_CONFERENCIA.value, StatusRecebimento.LIBERADO.value, StatusRecebimento.EM_CONFERENCIA.value, StatusRecebimento.EM_ANALISE.value, StatusRecebimento.FINALIZADO.value, StatusRecebimento.REJEITADO.value]
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
            raise ValueError("Não é possível liberar um romaneio sem OC e sem autorização do supervisor.")

        estado_anterior = recebimento.status
        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.liberar_conferencia()
            event_bus.publish('RECEBIMENTO_AGUARDANDO_CONFERENCIA', {'id': recebimento_id})
            
            # Avança os itens que estavam aguardando para a nova fase
            for item in recebimento.itens:
                if item.status == StatusRecebimentoItem.AGUARDANDO_LIBERACAO.value:
                    item.status = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value
            
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
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        # Se já estiver em conferência e for outra pessoa
        if recebimento.status == StatusRecebimento.EM_CONFERENCIA.value and recebimento.conferente and recebimento.conferente != conferente_id:
            raise ValueError(f"Esta atividade já está sendo conferida por {recebimento.conferente}.")

        # Se já é a própria pessoa voltando para a conferência
        if recebimento.status == StatusRecebimento.EM_CONFERENCIA.value and recebimento.conferente == conferente_id:
            return recebimento

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.iniciar_conferencia()
            recebimento.inicio = datetime.now()
            recebimento.conferente = conferente_id
            
            # Avança os itens para a fase de conferência
            for item in recebimento.itens:
                if item.status == StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value:
                    item.status = StatusRecebimentoItem.EM_CONFERENCIA.value
            event_bus.publish('RECEBIMENTO_EM_CONFERENCIA', {'id': recebimento_id, 'conferente': conferente_id})
        except Exception as e:
            raise ValueError(f"Não é possível iniciar a conferência: Status atual '{recebimento.status}' não permite transição para Conferência. (Erro: {str(e)})")

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
    def registrar_conferencia_item(db: Session, item_id: int, dados: any, usuario: str):
        item = db.query(RecebimentoItem).filter(RecebimentoItem.id == item_id).first()
        if not item:
            raise ValueError("Item não encontrado.")

        # 1. Atualiza as tentativas e o status do item
        item.tentativas = dados.tentativas
        item.status = dados.status_final

        # 2. Limpa leituras anteriores se houver (para permitir re-conferência limpa)
        from app.models.recebimento import RecebimentoLeitura
        db.query(RecebimentoLeitura).filter(RecebimentoLeitura.recebimento_item_id == item_id).delete()

        total_recebido = 0.0
        
        # 3. Processa cada leitura bipada
        from app.models.ua import UA
        from app.services.ua_service import UAService
        
        for leit in dados.leituras:
            # Calcula a quantidade convertida para a unidade da nota
            qtd_convertida = leit.quantidade * leit.fator_conversao
            total_recebido += qtd_convertida

            # Cria o registro da leitura para auditoria
            nova_leitura = RecebimentoLeitura(
                recebimento_item_id=item_id,
                qtd=leit.quantidade,
                und=leit.und,
                usuario=usuario,
                ua=leit.ua
            )
            db.add(nova_leitura)

            # CRIA A UA FÍSICA NO SISTEMA
            # Se a conferência foi concluída, a UA nasce no estado "Bom" e status "Aguardando Armazenamento"
            # (conforme a regra de negócio discutida)
            
            # Precisamos de uma filial_id. Pegamos do romaneio pai.
            filial_id = 1 # Fallback, mas idealmente vem do contexto ou da primeira filial do sistema
            
            nova_ua_obj = UA(
                ua=leit.ua,
                filial_id=filial_id,
                produto_id=item.sku, # item.sku é o ID do produto no wms
                lote=leit.lote,
                data_validade=datetime.strptime(leit.data_validade, "%d/%m/%Y") if leit.data_validade else None,
                quantidade=leit.quantidade,
                unidade_produto_id=leit.unidade_produto_id,
                fator_conversao=leit.fator_conversao,
                status="Aguardando Armazenamento",
                estado="Bom",
                criado_por=usuario
            )
            # Se a UA já existe (bipada como UA virgem), atualizamos. Senão, criamos.
            ua_existente = db.query(UA).filter(UA.ua == leit.ua).first()
            if ua_existente:
                ua_existente.produto_id = nova_ua_obj.produto_id
                ua_existente.lote = nova_ua_obj.lote
                ua_existente.data_validade = nova_ua_obj.data_validade
                ua_existente.quantidade = nova_ua_obj.quantidade
                ua_existente.unidade_produto_id = nova_ua_obj.unidade_produto_id
                ua_existente.fator_conversao = nova_ua_obj.fator_conversao
                ua_existente.status = nova_ua_obj.status
                ua_existente.atualizado_por = usuario
            else:
                db.add(nova_ua_obj)

        # 4. Atualiza a quantidade total recebida no item
        item.qtd_recebida = total_recebido

        db.commit()
        db.refresh(item)
        
        # 5. Verifica se o romaneio pai pode ser atualizado (se todos os itens estão concluídos)
        RecebimentoService.atualizar_status_pos_conferencia(db, item.recebimento_id)
        
        return item

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
            recebimento.conclusao = datetime.now()
            db.commit()

    @staticmethod
    def rejeitar_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.rejeitar()
        except Exception as e:
            raise ValueError("Não é possível rejeitar um romaneio concluído ou já finalizado.")

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def concluir_doca(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            recebimento.concluir()
            recebimento.conclusao = datetime.now()
        except Exception as e:
            raise ValueError("Apenas romaneios com conferências ativas podem ser concluídos.")

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def finalizar_recebimento_fiscal(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if recebimento.status != StatusRecebimento.EM_ANALISE.value:
            raise ValueError("O romaneio precisa ser concluído na doca e estar em análise para ser finalizado.")

        # Aqui no futuro entrará a lógica de gerar o stock (criar as UAs físicas)

        recebimento.status = StatusRecebimento.FINALIZADO.value
        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def vincular_oc(db_wms: Session, db_erp: Session, recebimento_id: int, oc: str):
        recebimento = db_wms.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

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
        
        # Atualiza status pai das notas paralelas que também foram vinculadas por repetição
        for rec_id in recebimentos_afetados:
            if rec_id != recebimento_id:
                RecebimentoService.atualizar_status_pai(db, rec_id)

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
            
            qtd_esperada_xml = float(item_oc["Qtd"]) * fator_relativo
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