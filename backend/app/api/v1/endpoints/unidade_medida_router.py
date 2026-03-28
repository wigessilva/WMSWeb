from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.unidade_medida import UnidadeMedidaSchema, UnidadeMedidaCriar
from app.services.unidade_medida_service import UnidadeMedidaService

router = APIRouter()

@router.post("/", response_model=UnidadeMedidaSchema)
def criar_unidade_medida(unidade: UnidadeMedidaCriar, db: Session = Depends(get_db)):
    return UnidadeMedidaService.criar(db=db, dados=unidade)

@router.get("/", response_model=list[UnidadeMedidaSchema])
def listar_unidades_medida(db: Session = Depends(get_db)):
    return UnidadeMedidaService.listar_todas(db)