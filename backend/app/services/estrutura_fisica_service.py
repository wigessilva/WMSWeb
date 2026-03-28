from sqlalchemy.orm import Session
from ..models.estrutura_fisica import EstruturaFisica
from ..schemas.estrutura_fisica import EstruturaFisicaCriar

class EstruturaFisicaService:
    @staticmethod
    def criar(db: Session, dados: EstruturaFisicaCriar):
        db_obj = EstruturaFisica(
            nome=dados.nome,
            comporta_palete=dados.comporta_palete,
            comporta_caixa=dados.comporta_caixa,
            comporta_log=dados.comporta_log
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(EstruturaFisica).all()