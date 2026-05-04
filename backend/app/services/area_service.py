from sqlalchemy.orm import Session
from fastapi import HTTPException
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

    @staticmethod
    def excluir(db: Session, area_id: int):
        area = db.query(Area).filter(Area.id == area_id).first()
        if not area:
            raise HTTPException(status_code=404, detail="Área não encontrada.")
        if area.enderecos:
            raise HTTPException(status_code=409, detail="Não é possível excluir. Existem endereços vinculados a esta área.")
        db.delete(area)
        db.commit()