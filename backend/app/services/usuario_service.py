from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from ..models.usuario import Usuario
from ..models.perfil import Perfil
from ..schemas.usuario import UsuarioCriar, UsuarioLogin
from ..core.security import obter_hash_senha, verificar_senha


def listar_usuarios(db: Session):
    return db.query(Usuario).all()


def criar_usuario(db: Session, usuario: UsuarioCriar, usuario_logado_id: int):
    # Verifica se o login ja existe
    if db.query(Usuario).filter(Usuario.login == usuario.login).first():
        raise HTTPException(status_code=400, detail="Login ja cadastrado.")

    # Verifica qual perfil esta a ser atribuido
    perfil_destino = db.query(Perfil).filter(Perfil.id == usuario.perfil_id).first()
    if not perfil_destino:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado.")

    # Regra 8: Somente um admin pode atribuir o perfil de admin a outro
    # Como ainda nao temos a autenticacao JWT 100% fechada, usamos o ID de quem esta a fazer o pedido
    usuario_logado = db.query(Usuario).filter(Usuario.id == usuario_logado_id).first()
    if usuario_logado:
        perfil_logado = db.query(Perfil).filter(Perfil.id == usuario_logado.perfil_id).first()
        if perfil_destino.nome == "Administrador" and perfil_logado.nome != "Administrador":
            raise HTTPException(status_code=403, detail="Apenas administradores podem criar outros administradores.")

    # Aplica o Argon2 na senha de 6 digitos
    senha_hash = obter_hash_senha(usuario.senha)

    db_usuario = Usuario(
        nome=usuario.nome,
        login=usuario.login,
        senha_hash=senha_hash,
        perfil_id=usuario.perfil_id,
        ativo=usuario.ativo
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario


def inativar_usuario(db: Session, usuario_id: int):
    db_usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")

    # Regra 7: O ultimo admin ativo nao pode ser inativado
    perfil_usuario = db.query(Perfil).filter(Perfil.id == db_usuario.perfil_id).first()
    if perfil_usuario and perfil_usuario.nome == "Administrador":
        outros_admins = db.query(Usuario).join(Perfil).filter(
            Perfil.nome == "Administrador",
            Usuario.ativo == True,
            Usuario.id != usuario_id
        ).first()

        if not outros_admins:
            raise HTTPException(status_code=400,
                                detail="Nao e possivel inativar o ultimo Administrador ativo do sistema.")

    # Regra 3: Usuarios nao podem ser excluidos, somente inativados
    db_usuario.ativo = False
    db.commit()
    db.refresh(db_usuario)
    return db_usuario


def autenticar_usuario(db: Session, credenciais: UsuarioLogin):
    usuario = db.query(Usuario).filter(Usuario.login == credenciais.login).first()

    # Valida se o usuário existe e se a senha (Argon2) bate com a digitada
    if not usuario or not verificar_senha(credenciais.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Login ou senha incorretos.")

    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Utilizador inativo. Procure o Administrador.")

    # Atualiza o carimbo de último acesso (Regra que você solicitou)
    usuario.ultimo_login = datetime.now()
    db.commit()
    db.refresh(usuario)

    return usuario