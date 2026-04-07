from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.usuario import UsuarioSchema, UsuarioLogin
from app.services import usuario_service

router = APIRouter()

@router.post("/login", response_model=UsuarioSchema)
def login(credenciais: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar_usuario(db, credenciais)
    
    # Monta a resposta com as permissões do perfil
    dados = UsuarioSchema.model_validate(usuario)
    
    # Injeta as permissões derivadas do perfil
    if usuario.perfil_relacao and usuario.perfil_relacao.nome == "Administrador":
        # Admin bypass: envia um marcador especial
        from app.models.permissao import Permissao
        todas = db.query(Permissao).all()
        dados.permissoes = [p.chave for p in todas]
    elif usuario.perfil_relacao:
        dados.permissoes = [p.chave for p in usuario.perfil_relacao.permissoes]
    
    return dados