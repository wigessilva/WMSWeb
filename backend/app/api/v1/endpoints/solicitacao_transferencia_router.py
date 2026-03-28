from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.solicitacao_transferencia import (
    SolicitacaoTransferenciaSchema,
    SolicitacaoTransferenciaCriar,
    SolicitacaoTransferenciaEditar,
    SolicitacaoTransferenciaAcao
)
from app.services.solicitacao_transferencia_service import SolicitacaoTransferenciaService

router = APIRouter()

@router.post("/", response_model=SolicitacaoTransferenciaSchema)
def criar_solicitacao(dados: SolicitacaoTransferenciaCriar, db: Session = Depends(get_db)):
    try:
        return SolicitacaoTransferenciaService.criar(db=db, dados=dados)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/filial/{filial_id}", response_model=list[SolicitacaoTransferenciaSchema])
def listar_solicitacoes_da_filial(
    filial_id: int,
    papel: str = Query("todas", description="Filtrar por: requisitante, atendente ou todas"),
    db: Session = Depends(get_db)
):
    return SolicitacaoTransferenciaService.listar_por_filial(db=db, filial_id=filial_id, papel=papel)

@router.patch("/{id}", response_model=SolicitacaoTransferenciaSchema)
def editar_solicitacao(
    dados: SolicitacaoTransferenciaEditar,
    id: int = Path(..., description="ID da solicitação"),
    filial_id: int = Query(..., description="ID da filial que está a editar"),
    db: Session = Depends(get_db)
):
    try:
        return SolicitacaoTransferenciaService.editar(db=db, id_solicitacao=id, filial_id=filial_id, dados=dados)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/cancelar", response_model=SolicitacaoTransferenciaSchema)
def cancelar_solicitacao(
    id: int = Path(..., description="ID da solicitação"),
    filial_id: int = Query(..., description="ID da filial requisitante"),
    db: Session = Depends(get_db)
):
    try:
        return SolicitacaoTransferenciaService.cancelar(db=db, id_solicitacao=id, filial_id=filial_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/encerrar", response_model=SolicitacaoTransferenciaSchema)
def perdoar_saldo_residual(
    id: int = Path(..., description="ID da solicitação"),
    filial_id: int = Query(..., description="ID da filial requisitante"),
    db: Session = Depends(get_db)
):
    try:
        return SolicitacaoTransferenciaService.encerrar_saldo_residual(db=db, id_solicitacao=id, filial_id=filial_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))