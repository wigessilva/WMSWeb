from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.finalidade_endereco import FinalidadeEnderecoSchema, FinalidadeEnderecoCriar
from app.services.finalidade_endereco_service import FinalidadeEnderecoService

router = APIRouter()

@router.post("/", response_model=FinalidadeEnderecoSchema)
def criar_finalidade_endereco(finalidade: FinalidadeEnderecoCriar, db: Session = Depends(get_db)):
    return FinalidadeEnderecoService.criar(db=db, dados=finalidade)

@router.get("/", response_model=list[FinalidadeEnderecoSchema])
def listar_finalidades_endereco(db: Session = Depends(get_db)):
    return FinalidadeEnderecoService.listar_todas(db)

@router.delete("/{finalidade_id}")
def excluir_finalidade_endereco(finalidade_id: int, db: Session = Depends(get_db)):
    FinalidadeEnderecoService.excluir(db=db, finalidade_id=finalidade_id)
    return {"mensagem": "Finalidade excluída com sucesso."}