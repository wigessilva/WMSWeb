from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.perfil import PerfilSchema, PerfilCriar
from app.services import perfil_service

router = APIRouter()

@router.get("/", response_model=List[PerfilSchema])
def listar_perfis(db: Session = Depends(get_db)):
    return perfil_service.listar_perfis(db)

@router.post("/", response_model=PerfilSchema)
def criar_perfil(perfil: PerfilCriar, db: Session = Depends(get_db)):
    return perfil_service.criar_perfil(db, perfil)

@router.put("/{perfil_id}", response_model=PerfilSchema)
def atualizar_perfil(perfil_id: int, perfil: PerfilCriar, db: Session = Depends(get_db)):
    return perfil_service.atualizar_perfil(db, perfil_id, perfil)

@router.delete("/{perfil_id}")
def excluir_perfil(perfil_id: int, db: Session = Depends(get_db)):
    perfil_service.excluir_perfil(db, perfil_id)
    return {"mensagem": "Perfil excluido com sucesso."}