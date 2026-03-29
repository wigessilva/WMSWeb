from sqlalchemy.orm import Session
from datetime import datetime
from ..models.recebimento import Recebimento, RecebimentoItem
from ..models.vinculo_fornecedor import VinculoProdutoFornecedor
from ..models.vinculo_unidade import VinculoUnidade
from ..schemas.recebimento import RecebimentoCriar
from ..enums import StatusRecebimento, StatusRecebimentoItem


class RecebimentoService:
    @staticmethod
    def importar_xml(db: Session, dados: RecebimentoCriar, cnpj_fornecedor: str):
        # 1. Cria o Cabeçalho (O Romaneio)
        db_receb = Recebimento(
            nfe=dados.nfe,
            oc=dados.oc,
            fornecedor=dados.fornecedor,
            status=StatusRecebimento.IMPORTADO.value
        )
        db.add(db_receb)
        db.flush()  # Guarda temporariamente para gerar o ID (Romaneio)

        # 2. Insere os itens e tenta fazer a tradução (De/Para) automaticamente
        for item_dados in dados.itens:
            # Tenta descobrir o SKU interno
            vinculo_prod = db.query(VinculoProdutoFornecedor).filter(
                VinculoProdutoFornecedor.cnpj_fornecedor == cnpj_fornecedor,
                VinculoProdutoFornecedor.codigo_fornecedor == item_dados.descricao
                # No futuro, pode ser o código exato do XML
            ).first()

            # Tenta descobrir a Unidade interna
            vinculo_und = db.query(VinculoUnidade).filter(
                VinculoUnidade.unidade_externa == item_dados.und
            ).first()

            # Define o status do item
            sku_encontrado = vinculo_prod.produto_id if vinculo_prod else None
            status_item = StatusRecebimentoItem.AGUARDANDO_CONFERENCIA.value if (
                        sku_encontrado and vinculo_und) else StatusRecebimentoItem.PENDENTE_VINCULO.value

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