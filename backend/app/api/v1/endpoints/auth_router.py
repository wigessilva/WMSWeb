from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.usuario import UsuarioSchema, UsuarioLogin, PasswordConfirm
from app.services import usuario_service
from app.core.auth_dep import get_current_user_active
from app.models.usuario import Usuario

router = APIRouter()

def preparar_usuario_schema(usuario: Usuario, db: Session) -> UsuarioSchema:
    """Helper para injetar permissões no UsuarioSchema."""
    dados = UsuarioSchema.model_validate(usuario)
    
    if usuario.perfil_relacao and usuario.perfil_relacao.nome == "Administrador":
        from app.models.permissao import Permissao
        todas = db.query(Permissao).all()
        dados.permissoes = [p.chave for p in todas]
    elif usuario.perfil_relacao:
        dados.permissoes = [p.chave for p in usuario.perfil_relacao.permissoes]
    
    return dados

@router.post("/login", response_model=UsuarioSchema)
def login(credenciais: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar_usuario(db, credenciais)
    return preparar_usuario_schema(usuario, db)

@router.get("/verify", response_model=UsuarioSchema)
def verificar_token(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user_active)
):
    """
    Verifica se o token de sessão enviado no header X-Session-Token é válido.
    Se for, retorna os dados do usuário e suas permissões atualizadas.
    """
    return preparar_usuario_schema(usuario_atual, db)

@router.post("/verify-password")
def verify_password(
    confirm: PasswordConfirm,
    usuario_atual: Usuario = Depends(get_current_user_active)
):
    from app.core.security import verificar_senha
    if not verificar_senha(confirm.password, usuario_atual.senha_hash):
        raise HTTPException(status_code=401, detail="Senha incorreta")
    return {"message": "Senha confirmada"}