from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.vinculo_unidade import VinculoUnidadeSchema, VinculoUnidadeCriar
from app.services.vinculo_unidade_service import VinculoUnidadeService

router = APIRouter()

@router.post("/", response_model=VinculoUnidadeSchema)
def criar_vinculo(vinculo: VinculoUnidadeCriar, db: Session = Depends(get_db)):
    return VinculoUnidadeService.criar(db=db, dados=vinculo)

@router.get("/", response_model=list[VinculoUnidadeSchema])
def listar_vinculos(db: Session = Depends(get_db)):
    return VinculoUnidadeService.listar_todos(db)

@router.put("/{vinculo_id}", response_model=VinculoUnidadeSchema)
def atualizar_vinculo(vinculo_id: int, vinculo: VinculoUnidadeCriar, db: Session = Depends(get_db)):
    return VinculoUnidadeService.atualizar(db=db, vinculo_id=vinculo_id, dados=vinculo)

@router.delete("/{vinculo_id}")
def excluir_vinculo(vinculo_id: int, db: Session = Depends(get_db)):
    VinculoUnidadeService.excluir(db=db, vinculo_id=vinculo_id)
    return {"mensagem": "Vínculo excluído com sucesso"}