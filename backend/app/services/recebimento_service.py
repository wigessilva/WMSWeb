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
        db.add(db_receb)
        db.flush()  # Guarda temporariamente para gerar o ID (Romaneio)

        # 1.5 Salva a tag original na tabela de histórico
        db_historico = HistoricoXML(
            nfe=dados.nfe,
            xped_original=dados.oc,
            conteudo_xml="Salvo para auditoria futura"
        )
        db.add(db_historico)

        # 2. Insere os itens e tenta fazer a tradução (De/Para) automaticamente
        for item_dados in dados.itens:
            # Tenta descobrir o SKU interno
            vinculo_prod = db.query(VinculoProdutoFornecedor).filter(
                VinculoProdutoFornecedor.cnpj_fornecedor == cnpj_fornecedor,
                VinculoProdutoFornecedor.codigo_fornecedor == item_dados.descricao
                # No futuro, pode ser o código exato do XML
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
                und=item_dados.und,
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
        if recebimento.status in [StatusRecebimento.LIBERADO.value, StatusRecebimento.EM_CONFERENCIA.value, StatusRecebimento.EM_ANALISE.value, StatusRecebimento.FINALIZADO.value]:
            return recebimento

        itens = db.query(RecebimentoItem).filter(RecebimentoItem.recebimento_id == recebimento_id).all()

        tem_pendencia = any(item.status == StatusRecebimentoItem.PENDENTE_VINCULO.value for item in itens)

        if tem_pendencia:
            recebimento.status = StatusRecebimento.PENDENTE.value
        else:
            recebimento.status = StatusRecebimento.AGUARDANDO_LIBERACAO.value

        db.commit()
        db.refresh(recebimento)
        return recebimento

    # # # AÇÕES MANUAIS DE GESTÃO E AUDITORIA # # #

    @staticmethod
    def liberar_romaneio(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if recebimento.status != StatusRecebimento.AGUARDANDO_LIBERACAO.value:
            raise ValueError("O romaneio possui pendências ou já foi liberado.")

        recebimento.status = StatusRecebimento.LIBERADO.value
        db.commit()
        db.refresh(recebimento)
        return recebimento

    @staticmethod
    def concluir_doca(db: Session, recebimento_id: int):
        recebimento = db.query(Recebimento).filter(Recebimento.id == recebimento_id).first()
        if recebimento.status != StatusRecebimento.EM_CONFERENCIA.value:
            raise ValueError("Apenas romaneios em conferência podem ser concluídos na doca.")

        recebimento.status = StatusRecebimento.EM_ANALISE.value
        recebimento.conclusao = datetime.now()
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
        db_wms.commit()
        db_wms.refresh(recebimento)
        return recebimento

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
                item.status = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value

        db.commit()

        # Atualiza o status do pai (romaneio) para ver se sai de PENDENTE
        return RecebimentoService.atualizar_status_pai(db, recebimento_id)