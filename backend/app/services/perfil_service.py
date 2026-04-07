from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.perfil import Perfil
from ..models.usuario import Usuario
from ..schemas.perfil import PerfilCriar

def listar_perfis(db: Session):
    return db.query(Perfil).all()

def criar_perfil(db: Session, perfil: PerfilCriar):
    db_perfil = Perfil(nome=perfil.nome, descricao=perfil.descricao, permite_liberar_sem_oc=perfil.permite_liberar_sem_oc)
    db.add(db_perfil)
    db.commit()
    db.refresh(db_perfil)
    return db_perfil

def atualizar_perfil(db: Session, perfil_id: int, perfil_atualizado: PerfilCriar):
    db_perfil = db.query(Perfil).filter(Perfil.id == perfil_id).first()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado")

    # Regra 5: Nao alterar o Administrador
    if db_perfil.nome == "Administrador":
        raise HTTPException(status_code=403, detail="O perfil Administrador nao pode ser alterado.")

    db_perfil.nome = perfil_atualizado.nome
    db_perfil.descricao = perfil_atualizado.descricao
    db_perfil.permite_liberar_sem_oc = perfil_atualizado.permite_liberar_sem_oc
    db.commit()
    db.refresh(db_perfil)
    return db_perfil

def excluir_perfil(db: Session, perfil_id: int):
    db_perfil = db.query(Perfil).filter(Perfil.id == perfil_id).first()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado")

    # Regra 5: Nao excluir o Administrador
    if db_perfil.nome == "Administrador":
        raise HTTPException(status_code=403, detail="O perfil Administrador nao pode ser excluido.")

    # Regra 2: Nao excluir se houver usuarios vinculados
    usuarios_vinculados = db.query(Usuario).filter(Usuario.perfil_id == perfil_id).first()
    if usuarios_vinculados:
        raise HTTPException(status_code=400, detail="Nao e possivel excluir um perfil que possui usuarios vinculados.")

    db.delete(db_perfil)
    db.commit()