from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.familia import FamiliaSchema, FamiliaCriar, FamiliaEditar
from app.services.familia_service import FamiliaService

router = APIRouter()

@router.post("/", response_model=FamiliaSchema)
def criar_familia(familia: FamiliaCriar, db: Session = Depends(get_db)):
    return FamiliaService.criar(db=db, dados=familia)

@router.get("/", response_model=list[FamiliaSchema])
def listar_familias(db: Session = Depends(get_db)):
    return FamiliaService.listar_todas(db)

@router.put("/{familia_id}", response_model=FamiliaSchema)
def atualizar_familia(familia_id: int, familia: FamiliaEditar, db: Session = Depends(get_db)):
    familia_atualizada = FamiliaService.atualizar(db=db, familia_id=familia_id, dados=familia)
    if not familia_atualizada:
        raise HTTPException(status_code=404, detail="Família não encontrada")
    return familia_atualizada