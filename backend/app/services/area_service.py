from sqlalchemy.orm import Session
from ..models.area import Area
from ..schemas.area import AreaCriar

class AreaService:
    @staticmethod
    def criar(db: Session, dados: AreaCriar):
        db_obj = Area(
            letra=dados.letra.upper(), # Força a letra a ficar sempre em maiúscula
            descricao=dados.descricao,
            filial_id=dados.filial_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(Area).all()