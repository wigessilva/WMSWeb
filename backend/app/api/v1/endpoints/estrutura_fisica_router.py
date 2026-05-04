from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.estrutura_fisica import EstruturaFisicaSchema, EstruturaFisicaCriar
from app.services.estrutura_fisica_service import EstruturaFisicaService

router = APIRouter()

@router.post("/", response_model=EstruturaFisicaSchema)
def criar_estrutura_fisica(estrutura: EstruturaFisicaCriar, db: Session = Depends(get_db)):
    return EstruturaFisicaService.criar(db=db, dados=estrutura)

@router.get("/", response_model=list[EstruturaFisicaSchema])
def listar_estruturas_fisicas(db: Session = Depends(get_db)):
    return EstruturaFisicaService.listar_todas(db)

@router.delete("/{estrutura_id}")
def excluir_estrutura_fisica(estrutura_id: int, db: Session = Depends(get_db)):
    EstruturaFisicaService.excluir(db=db, estrutura_id=estrutura_id)
    return {"mensagem": "Estrutura física excluída com sucesso."}