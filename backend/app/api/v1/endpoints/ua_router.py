from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.ua import UASchema, UACriar
from app.services.ua_service import UAService

router = APIRouter()

@router.post("/", response_model=UASchema)
def criar_ua_individual(ua: UACriar, db: Session = Depends(get_db)):
    # Gera apenas uma UA
    return UAService.criar(db=db, dados=ua)

@router.post("/lote", response_model=list[UASchema])
def criar_uas_lote(
    ua: UACriar,
    quantidade: int = Query(..., gt=0, description="Quantidade de UAs idênticas a gerar"),
    db: Session = Depends(get_db)
):
    # Gera dezenas ou centenas de UAs com o mesmo conteúdo mas códigos únicos
    return UAService.criar_em_lote(db=db, dados=ua, quantidade=quantidade)

@router.get("/", response_model=list[UASchema])
def listar_uas(db: Session = Depends(get_db)):
    return UAService.listar_todas(db)