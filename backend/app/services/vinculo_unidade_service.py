from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.vinculo_unidade import VinculoUnidade
from ..schemas.vinculo_unidade import VinculoUnidadeCriar


class VinculoUnidadeService:
    @staticmethod
    def criar(db: Session, dados: VinculoUnidadeCriar):
        # Verifica se o vínculo externo já existe para evitar duplicações
        existente = db.query(VinculoUnidade).filter(
            VinculoUnidade.unidade_externa == dados.unidade_externa.upper()
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este vínculo externo já existe.")

        db_obj = VinculoUnidade(
            unidade_externa=dados.unidade_externa.upper(),
            unidade_medida_id=dados.unidade_medida_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todos(db: Session):
        return db.query(VinculoUnidade).all()

    @staticmethod
    def atualizar(db: Session, vinculo_id: int, dados: VinculoUnidadeCriar):
        db_obj = db.query(VinculoUnidade).filter(VinculoUnidade.id == vinculo_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Vínculo não encontrado")

        # Verifica se a nova sigla externa já está em uso por outro id
        existente = db.query(VinculoUnidade).filter(
            VinculoUnidade.unidade_externa == dados.unidade_externa.upper(),
            VinculoUnidade.id != vinculo_id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="Este vínculo externo já existe noutro registo.")

        db_obj.unidade_externa = dados.unidade_externa.upper()
        db_obj.unidade_medida_id = dados.unidade_medida_id
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def excluir(db: Session, vinculo_id: int):
        db_obj = db.query(VinculoUnidade).filter(VinculoUnidade.id == vinculo_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Vínculo não encontrado")
        db.delete(db_obj)
        db.commit()