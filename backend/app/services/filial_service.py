from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.filial import Filial
from ..schemas.filial import FilialCriar

class FilialService:
    @staticmethod
    def criar(db: Session, dados: FilialCriar):
        if dados.is_matriz:
            matriz_existente = db.query(Filial).filter(Filial.is_matriz == True).first()
            if matriz_existente:
                raise HTTPException(status_code=400, detail="Já existe uma matriz cadastrada no sistema")

        db_obj = Filial(
            nome=dados.nome,
            cnpj=dados.cnpj,
            url_api=dados.url_api,
            is_matriz=dados.is_matriz,
            ativo=dados.ativo
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(Filial).all()

    @staticmethod
    def atualizar(db: Session, filial_id: int, dados: dict):
        db_obj = db.query(Filial).filter(Filial.id == filial_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Filial não encontrada")

        # Verifica a trava de Matriz única caso o usuário esteja tentando marcá-la como matriz
        if dados.get("is_matriz"):
            matriz_existente = db.query(Filial).filter(Filial.is_matriz == True, Filial.id != filial_id).first()
            if matriz_existente:
                raise HTTPException(status_code=400, detail="Já existe uma matriz cadastrada no sistema.")

        for key, value in dados.items():
            setattr(db_obj, key, value)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def excluir(db: Session, filial_id: int):
        db_obj = db.query(Filial).filter(Filial.id == filial_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Filial não encontrada")

        db.delete(db_obj)
        db.commit()