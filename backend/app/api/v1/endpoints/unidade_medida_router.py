from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db, get_erp_db
from app.schemas.unidade_medida import UnidadeMedidaSchema, UnidadeMedidaCriar, UnidadeMedidaUpdate
from app.services.unidade_medida_service import UnidadeMedidaService
from app.services.erp_sync_service import ServicoSincronizacaoERP

router = APIRouter()

@router.get("/", response_model=list[UnidadeMedidaSchema])
def listar_unidades_medida(natureza: str | None = Query(None), db: Session = Depends(get_db)):
    return UnidadeMedidaService.listar_todas(db, natureza=natureza)

@router.patch("/{unidade_id}", response_model=UnidadeMedidaSchema)
def atualizar_unidade(unidade_id: int, payload: UnidadeMedidaUpdate, db: Session = Depends(get_db)):
    return UnidadeMedidaService.atualizar(
        db=db, 
        unidade_id=unidade_id, 
        decimais=payload.decimais,
        natureza=payload.natureza,
        fator_conversao=payload.fator_conversao,
        usuario=payload.usuario
    )

@router.post("/sincronizar")
def sincronizar_com_erp(
    usuario: str | None = Query(None),
    db_wms: Session = Depends(get_db), 
    db_erp: Session = Depends(get_erp_db)
):
    return ServicoSincronizacaoERP.sincronizar_unidades_medida(db_wms=db_wms, db_erp=db_erp, usuario=usuario)