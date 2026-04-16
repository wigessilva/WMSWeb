from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.usuario import UsuarioSchema, UsuarioCriar, UsuarioAtualizar
from app.services import usuario_service

from app.core.auth_dep import get_current_user_active
from app.models.usuario import Usuario

router = APIRouter(dependencies=[Depends(get_current_user_active)])

@router.get("/", response_model=List[UsuarioSchema])
def listar_usuarios(db: Session = Depends(get_db)):
    return usuario_service.listar_usuarios(db)

@router.post("/", response_model=UsuarioSchema)
def criar_usuario(
    usuario: UsuarioCriar, 
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user_active)
):
    return usuario_service.criar_usuario(db, usuario, usuario_logado.id)

@router.put("/{usuario_id}/inativar", response_model=UsuarioSchema)
def inativar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return usuario_service.inativar_usuario(db, usuario_id)

@router.put("/{usuario_id}", response_model=UsuarioSchema)
def atualizar_usuario(usuario_id: int, dados: UsuarioAtualizar, db: Session = Depends(get_db)):
    return usuario_service.atualizar_usuario(db, usuario_id, dados)