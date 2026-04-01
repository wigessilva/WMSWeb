from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.usuario import UsuarioSchema, UsuarioCriar
from app.services import usuario_service

router = APIRouter()

@router.get("/", response_model=List[UsuarioSchema])
def listar_usuarios(db: Session = Depends(get_db)):
    return usuario_service.listar_usuarios(db)

@router.post("/", response_model=UsuarioSchema)
def criar_usuario(usuario: UsuarioCriar, db: Session = Depends(get_db)):
    # ATENÇÃO: Como ainda não temos o sistema de Login/Token (JWT) implementado,
    # vamos simular que quem está a criar o utilizador é o Administrador (ID 1).
    # Mais tarde, substituiremos este "1" pelo ID real do utilizador que fez o login.
    usuario_logado_id = 1
    return usuario_service.criar_usuario(db, usuario, usuario_logado_id)

@router.put("/{usuario_id}/inativar", response_model=UsuarioSchema)
def inativar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return usuario_service.inativar_usuario(db, usuario_id)