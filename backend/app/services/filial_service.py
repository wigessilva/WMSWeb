from sqlalchemy.orm import Session
from ..models.filial import Filial
from ..schemas.filial import FilialCriar

class FilialService:
    @staticmethod
    def criar(db: Session, dados: FilialCriar):
        db_obj = Filial(
            nome=dados.nome,
            cnpj=dados.cnpj,
            is_matriz=dados.is_matriz
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(Filial).all()