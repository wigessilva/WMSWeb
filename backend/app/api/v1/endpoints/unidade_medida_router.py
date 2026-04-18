from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db, get_erp_db
from app.schemas.unidade_medida import UnidadeMedidaSchema, UnidadeMedidaCriar, UnidadeMedidaUpdate
from app.services.unidade_medida_service import UnidadeMedidaService
from app.services.erp_sync_service import ServicoSincronizacaoERP

router = APIRouter()

@router.post("/", response_model=UnidadeMedidaSchema)
def criar_unidade_medida(unidade: UnidadeMedidaCriar, db: Session = Depends(get_db)):
    return UnidadeMedidaService.criar(db=db, dados=unidade)

@router.get("/", response_model=list[UnidadeMedidaSchema])
def listar_unidades_medida(db: Session = Depends(get_db)):
    return UnidadeMedidaService.listar_todas(db)

@router.patch("/{unidade_id}", response_model=UnidadeMedidaSchema)
def atualizar_unidade(unidade_id: int, payload: UnidadeMedidaUpdate, db: Session = Depends(get_db)):
    return UnidadeMedidaService.atualizar(
        db=db, 
        unidade_id=unidade_id, 
        decimais=payload.decimais,
        natureza=payload.natureza
    )

@router.post("/sincronizar")
def sincronizar_com_erp(db_wms: Session = Depends(get_db), db_erp: Session = Depends(get_erp_db)):
    return ServicoSincronizacaoERP.sincronizar_unidades_medida(db_wms=db_wms, db_erp=db_erp)