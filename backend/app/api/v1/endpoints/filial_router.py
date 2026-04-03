from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.filial import FilialSchema, FilialCriar
from app.services.filial_service import FilialService

router = APIRouter()

@router.post("/", response_model=FilialSchema)
def criar_filial(filial: FilialCriar, db: Session = Depends(get_db)):
    return FilialService.criar(db=db, dados=filial)

@router.get("/", response_model=list[FilialSchema])
def listar_filiais(db: Session = Depends(get_db)):
    return FilialService.listar_todas(db)

@router.put("/{filial_id}", response_model=FilialSchema)
def atualizar_filial(filial_id: int, filial: FilialCriar, db: Session = Depends(get_db)):
    return FilialService.atualizar(db=db, filial_id=filial_id, dados=filial.model_dump(exclude_unset=True))

@router.delete("/{filial_id}")
def excluir_filial(filial_id: int, db: Session = Depends(get_db)):
    FilialService.excluir(db=db, filial_id=filial_id)
    return {"message": "Filial excluída com sucesso"}