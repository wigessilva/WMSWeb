from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.parametros_mestres import ParametrosMestresSchema, ParametrosMestresEditar
from app.services.parametros_mestres_service import ParametrosMestresService

router = APIRouter()

@router.get("/", response_model=ParametrosMestresSchema)
def obter_parametros_mestres(db: Session = Depends(get_db)):
    return ParametrosMestresService.obter_parametros(db)

@router.put("/", response_model=ParametrosMestresSchema)
def atualizar_parametros_mestres(parametros: ParametrosMestresEditar, db: Session = Depends(get_db)):
    return ParametrosMestresService.atualizar_parametros(db=db, dados=parametros)