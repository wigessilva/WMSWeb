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
        if not oc_verificada:
            fsm_rec.bloquear()
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
            # Tenta descobrir o SKU interno
            vinculo_prod = db.query(VinculoProdutoFornecedor).filter(
                VinculoProdutoFornecedor.cnpj_fornecedor == cnpj_fornecedor,
                VinculoProdutoFornecedor.codigo_fornecedor == item_dados.codigo_fornecedor
            ).first()

            # Tenta descobrir a Unidade interna
            # Confere primeiro se existe na tabela UnidadesMedida (sigla exata)
            unidade_interna_direta = db.query(UnidadeMedida).filter(
                UnidadeMedida.sigla == item_dados.und
            ).first()

            vinculo_und = None
            if not unidade_interna_direta:
                # Se não achou direto, confere na tabela de vínculos
                vinculo_und = db.query(VinculoUnidade).filter(
                    VinculoUnidade.unidade_externa == item_dados.und
                ).first()

            # Define o status do item
            sku_encontrado = vinculo_prod.produto_id if vinculo_prod else None
            unidade_resolvida = unidade_interna_direta or vinculo_und
            status_item = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value if (
                    sku_encontrado and unidade_resolvida) else StatusRecebimentoItem.PENDENTE_VINCULO.value

            novo_item = RecebimentoItem(
                recebimento_id=db_receb.id,
                descricao=item_dados.descricao,
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
        # A nossa Máquina de Estados Finita Simplificada
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            return None

        # Se já passou da fase de libertação, as mudanças são manuais, não mexe.
        if recebimento.status in [StatusRecebimento.AGUARDANDO_CONFERENCIA.value, StatusRecebimento.LIBERADO.value, StatusRecebimento.EM_CONFERENCIA.value, StatusRecebimento.EM_ANALISE.value, StatusRecebimento.FINALIZADO.value, StatusRecebimento.REJEITADO.value]:
            return recebimento

        itens = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).all()

        tem_pendencia = any(item.status == StatusRecebimentoItem.PENDENTE_VINCULO.value for item in itens)

        fsm = RecebimentoFSM(recebimento)
        
        if not tem_pendencia and recebimento.oc:
            try:
                if recebimento.status == 'BLOQUEADO':
                    fsm.desbloquear()
                fsm.preparar_para_liberar()
                event_bus.publish('RECEBIMENTO_AGUARDANDO_LIBERACAO', {'id': recebimento_id})
            except Exception as e:
                pass
        elif tem_pendencia and recebimento.status != 'BLOQUEADO':
            recebimento.status = StatusRecebimento.IMPORTADO.value

        db.commit()
        db.refresh(recebimento)
        return recebimento

    # # # AÇÕES MANUAIS DE GESTÃO E AUDITORIA # # #

    @staticmethod
    def liberar_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            fsm.liberar_conferencia()
            event_bus.publish('RECEBIMENTO_AGUARDANDO_CONFERENCIA', {'id': recebimento_id})
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
        if recebimento.status == StatusRecebimento.EM_CONFERENCIA.value and recebimento.conferente_id and recebimento.conferente_id != conferente_id:
            raise ValueError(f"Esta atividade já está sendo conferida por {recebimento.conferente_id}.")

        # Se já é a própria pessoa voltando para a conferência
        if recebimento.status == StatusRecebimento.EM_CONFERENCIA.value and recebimento.conferente_id == conferente_id:
            return recebimento

        fsm = RecebimentoFSM(recebimento)
        try:
            fsm.iniciar_conferencia()
            recebimento.data_inicio = datetime.now()
            recebimento.conferente_id = conferente_id
            event_bus.publish('RECEBIMENTO_EM_CONFERENCIA', {'id': recebimento_id, 'conferente': conferente_id})
        except Exception as e:
            raise ValueError("Não é possível iniciar a conferência deste romaneio (status inválido).")

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
            fsm.cancelar_conferencia()
        except Exception as e:
            raise ValueError("Não é possível cancelar uma conferência neste status.")

        # Zera as contagens apagando as leituras e resetando qtd_recebida
        itens = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).all()
        for item in itens:
            item.qtd_recebida = 0.0
            from app.models.recebimento import RecebimentoLeitura
            db.query(RecebimentoLeitura).filter(RecebimentoLeitura.recebimento_item_id == item.id).delete()
            
            # Se já estavam conferidos ou divergentes, voltam para liberado
            if item.status in [StatusRecebimentoItem.CONFERIDO.value, StatusRecebimentoItem.DIVERGENTE.value]:
                item.status = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value

        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def rejeitar_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if not recebimento:
            raise ValueError("Romaneio não encontrado.")

        fsm = RecebimentoFSM(recebimento)
        try:
            fsm.rejeitar()
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
            fsm.concluir()
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
            fsm.desbloquear()
        
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

        # Atualiza os itens deste recebimento que estavam pendentes por causa desta unidade
        itens = db.query(RecebimentoItem).filter(
            RecebimentoItem.recebimento_id == recebimento_id,
            RecebimentoItem.und == unidade_externa,
            RecebimentoItem.status == StatusRecebimentoItem.PENDENTE_VINCULO.value
        ).all()

        for item in itens:
            # Se o SKU já estiver preenchido, o item tem tudo o que precisa e sai da pendência
            if item.sku:
                fsm_item = RecebimentoItemFSM(item)
                try:
                    fsm_item.vincular_sku()
                except:
                    pass

        db.commit()

        # Atualiza o status do pai (romaneio) para ver se sai de PENDENTE
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

        codigo_do_forn = item.codigo_fornecedor or item.descricao

        existente = db.query(VinculoProdutoFornecedor).filter(
            VinculoProdutoFornecedor.cnpj_fornecedor == cnpj,
            VinculoProdutoFornecedor.codigo_fornecedor == codigo_do_forn
        ).first()

        if not existente:
            novo_vinculo = VinculoProdutoFornecedor(
                cnpj_fornecedor=cnpj,
                codigo_fornecedor=codigo_do_forn,
                produto_id=produto_id,
                criado_por=criado_por
            )
            db.add(novo_vinculo)
            db.flush()
        else:
            existente.produto_id = produto_id
            if criado_por:
                existente.criado_por = criado_por

        # Atualiza os itens do mesmo produto nesta nota
        itens_pendentes = db.query(RecebimentoItem).filter(
            RecebimentoItem.recebimento_id == recebimento_id,
            RecebimentoItem.codigo_fornecedor == item.codigo_fornecedor,
            RecebimentoItem.status == StatusRecebimentoItem.PENDENTE_VINCULO.value
        ).all()

        for it_pend in itens_pendentes:
            it_pend.sku = produto_id
            unidade_interna_direta = db.query(UnidadeMedida).filter(UnidadeMedida.sigla == it_pend.und).first()
            vinculo_und = None
            if not unidade_interna_direta:
                vinculo_und = db.query(VinculoUnidade).filter(VinculoUnidade.unidade_externa == it_pend.und).first()
            unidade_resolvida = unidade_interna_direta or vinculo_und
            if unidade_resolvida:
                fsm_item = RecebimentoItemFSM(it_pend)
                try:
                    fsm_item.vincular_sku()
                except:
                    pass

        # Força atualização do item clicado
        item.sku = produto_id
        unidade_interna_direta = db.query(UnidadeMedida).filter(UnidadeMedida.sigla == item.und).first()
        vinculo_und = None
        if not unidade_interna_direta:
            vinculo_und = db.query(VinculoUnidade).filter(VinculoUnidade.unidade_externa == item.und).first()
        if (unidade_interna_direta or vinculo_und) and item.status == StatusRecebimentoItem.PENDENTE_VINCULO.value:
            fsm_item = RecebimentoItemFSM(item)
            try:
                fsm_item.vincular_sku()
                event_bus.publish('SKU_VINCULADO_SUCESSO', {'item_id': item.id, 'sku': produto_id})
            except:
                pass

        db.commit()
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