from sqlalchemy.orm import Session
from ..models.solicitacao_transferencia import SolicitacaoTransferencia
from ..schemas.solicitacao_transferencia import SolicitacaoTransferenciaCriar, SolicitacaoTransferenciaEditar

class SolicitacaoTransferenciaService:
    @staticmethod
    def criar(db: Session, dados: SolicitacaoTransferenciaCriar):
        if dados.filial_requisitante_id == dados.filial_atendente_id:
            raise ValueError("A filial requisitante não pode ser a mesma que a atendente.")

        db_obj = SolicitacaoTransferencia(
            filial_requisitante_id=dados.filial_requisitante_id,
            filial_atendente_id=dados.filial_atendente_id,
            produto_id=dados.produto_id,
            quantidade_solicitada=dados.quantidade_solicitada,
            quantidade_atendida=0.0,
            status="pendente"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_por_filial(db: Session, filial_id: int, papel: str = "todas"):
        query = db.query(SolicitacaoTransferencia)
        if papel == "requisitante":
            query = query.filter(SolicitacaoTransferencia.filial_requisitante_id == filial_id)
        elif papel == "atendente":
            query = query.filter(SolicitacaoTransferencia.filial_atendente_id == filial_id)
        else:
            query = query.filter(
                (SolicitacaoTransferencia.filial_requisitante_id == filial_id) |
                (SolicitacaoTransferencia.filial_atendente_id == filial_id)
            )
        return query.all()

    @staticmethod
    def editar(db: Session, id_solicitacao: int, filial_id: int, dados: SolicitacaoTransferenciaEditar):
        solicitacao = db.query(SolicitacaoTransferencia).filter(SolicitacaoTransferencia.id == id_solicitacao).first()
        if not solicitacao:
            raise ValueError("Solicitação não encontrada.")

        if solicitacao.filial_requisitante_id != filial_id:
            raise ValueError("Apenas a filial requisitante pode editar o pedido.")

        if solicitacao.status != "pendente":
            raise ValueError("Apenas solicitações pendentes podem ser editadas.")

        solicitacao.quantidade_solicitada = dados.quantidade_solicitada
        db.commit()
        db.refresh(solicitacao)
        return solicitacao

    @staticmethod
    def cancelar(db: Session, id_solicitacao: int, filial_id: int):
        solicitacao = db.query(SolicitacaoTransferencia).filter(SolicitacaoTransferencia.id == id_solicitacao).first()
        if not solicitacao:
            raise ValueError("Solicitação não encontrada.")

        if solicitacao.filial_requisitante_id != filial_id:
            raise ValueError("Apenas a filial requisitante pode cancelar o pedido.")

        if solicitacao.status not in ["pendente"]:
            raise ValueError("O pedido já está a ser atendido e não pode ser cancelado diretamente.")

        solicitacao.status = "cancelada"
        db.commit()
        db.refresh(solicitacao)
        return solicitacao

    @staticmethod
    def encerrar_saldo_residual(db: Session, id_solicitacao: int, filial_id: int):
        # Esta é a função "Perdoar"
        solicitacao = db.query(SolicitacaoTransferencia).filter(SolicitacaoTransferencia.id == id_solicitacao).first()
        if not solicitacao:
            raise ValueError("Solicitação não encontrada.")

        if solicitacao.filial_requisitante_id != filial_id:
            raise ValueError("Apenas a filial requisitante pode perdoar o saldo residual.")

        if solicitacao.status in ["finalizada", "cancelada"]:
            raise ValueError("Esta solicitação já está encerrada.")

        solicitacao.status = "finalizada"
        db.commit()
        db.refresh(solicitacao)
        return solicitacao