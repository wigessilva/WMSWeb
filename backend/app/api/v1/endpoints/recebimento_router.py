from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.recebimento import RecebimentoCriar, RecebimentoSchema
from app.services.recebimento_service import RecebimentoService

router = APIRouter()

@router.post("/importar", response_model=RecebimentoSchema)
def importar_romaneio(
    dados: RecebimentoCriar,
    cnpj_fornecedor: str = Query(..., description="CNPJ do Fornecedor para o motor de De/Para"),
    db: Session = Depends(get_db)
):
    # Aqui simulamos a chegada do XML já convertido em JSON pelo frontend
    return RecebimentoService.importar_xml(db=db, dados=dados, cnpj_fornecedor=cnpj_fornecedor)

@router.post("/{id}/liberar", response_model=RecebimentoSchema)
def liberar_romaneio(
    id: int = Path(..., description="ID do Romaneio"),
    db: Session = Depends(get_db)
):
    try:
        return RecebimentoService.liberar_romaneio(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/concluir-doca", response_model=RecebimentoSchema)
def concluir_doca(
    id: int = Path(..., description="ID do Romaneio"),
    db: Session = Depends(get_db)
):
    try:
        return RecebimentoService.concluir_doca(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/finalizar", response_model=RecebimentoSchema)
def finalizar_recebimento_fiscal(
    id: int = Path(..., description="ID do Romaneio"),
    db: Session = Depends(get_db)
):
    try:
        return RecebimentoService.finalizar_recebimento_fiscal(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))