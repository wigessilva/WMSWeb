from sqlalchemy.orm import Session
from sqlalchemy import inspect
from fastapi import HTTPException
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

    @staticmethod
    def excluir(db: Session, estrutura_id: int):
        estrutura = db.query(EstruturaFisica).filter(EstruturaFisica.id == estrutura_id).first()
        if not estrutura:
            raise HTTPException(status_code=404, detail="Estrutura física não encontrada.")
        # Verifica se há endereços vinculados
        from ..models.endereco import Endereco
        count = db.query(Endereco).filter(Endereco.estrutura_fisica_id == estrutura_id).count()
        if count > 0:
            raise HTTPException(status_code=409, detail=f"Não é possível excluir. Existem {count} endereço(s) usando esta estrutura.")
        db.delete(estrutura)
        db.commit()