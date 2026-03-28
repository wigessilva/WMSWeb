from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.ua import UASchema, UACriar, UAExpedirTransferencia, UAReceberTransferencia
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

@router.post("/{codigo}/expedir", response_model=UASchema)
def expedir_ua(codigo: str, dados: UAExpedirTransferencia, db: Session = Depends(get_db)):
    try:
        return UAService.expedir_transferencia(db=db, codigo=codigo, dados=dados)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{codigo}/receber", response_model=UASchema)
def receber_ua(
    codigo: str,
    dados: UAReceberTransferencia,
    filial_id: int = Query(..., description="ID da Filial onde o operador está a bipar a entrada"),
    db: Session = Depends(get_db)
):
    try:
        return UAService.receber_transferencia(db=db, codigo=codigo, nova_filial_id=filial_id, dados=dados)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))