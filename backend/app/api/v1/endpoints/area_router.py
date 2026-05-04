from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.area import AreaSchema, AreaCriar
from app.services.area_service import AreaService

router = APIRouter()

@router.post("/", response_model=AreaSchema)
def criar_area(area: AreaCriar, db: Session = Depends(get_db)):
    return AreaService.criar(db=db, dados=area)

@router.get("/", response_model=list[AreaSchema])
def listar_areas(db: Session = Depends(get_db)):
    return AreaService.listar_todas(db)

@router.delete("/{area_id}")
def excluir_area(area_id: int, db: Session = Depends(get_db)):
    AreaService.excluir(db=db, area_id=area_id)
    return {"mensagem": "Área excluída com sucesso."}