from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.usuario import UsuarioSchema, UsuarioLogin
from app.services import usuario_service

router = APIRouter()

@router.post("/login", response_model=UsuarioSchema)
def login(credenciais: UsuarioLogin, db: Session = Depends(get_db)):
    return usuario_service.autenticar_usuario(db, credenciais)