from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.regra_global import RegraGlobalSchema, RegraGlobalEditar
from app.services.regra_global_service import RegraGlobalService

router = APIRouter()

@router.get("/", response_model=RegraGlobalSchema)
def obter_regras_globais(db: Session = Depends(get_db)):
    return RegraGlobalService.obter_regras(db)

@router.put("/", response_model=RegraGlobalSchema)
def atualizar_regras_globais(regras: RegraGlobalEditar, db: Session = Depends(get_db)):
    return RegraGlobalService.atualizar_regras(db=db, dados=regras)