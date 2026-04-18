from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.unidade_medida import UnidadeMedida
from ..schemas.unidade_medida import UnidadeMedidaCriar

class UnidadeMedidaService:
    @staticmethod
    def listar_todas(db: Session):
        return db.query(UnidadeMedida).all()

    @staticmethod
    def atualizar(db: Session, unidade_id: int, decimais: bool | None = None, natureza: str | None = None, usuario: str | None = None):
        db_obj = db.query(UnidadeMedida).filter(UnidadeMedida.id == unidade_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Unidade de medida não encontrada")

        if decimais is not None:
            db_obj.decimais = decimais
        if natureza is not None:
            db_obj.natureza = natureza
        if usuario is not None:
            db_obj.atualizado_por = usuario

        db.commit()
        db.refresh(db_obj)
        return db_obj