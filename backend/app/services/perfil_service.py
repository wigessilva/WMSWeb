from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional, Set
from ..models.perfil import Perfil
from ..models.usuario import Usuario
from ..models.permissao import Permissao
from ..schemas.perfil import PerfilCriar

def _validar_delegacao(permissoes_destino: List[str], editor_permissoes: Optional[List[str]], permissoes_originais: Optional[Set[str]] = None):
    """
    Valida que o editor só atribui permissões que ele próprio possui.
    permissoes_originais: permissões que o perfil já tinha (para edição).
    """
    if editor_permissoes is None:
        return  # Sem informação do editor, aceita (backwards compat)

    editor_set = set(editor_permissoes)
    originais = permissoes_originais or set()

    for chave in permissoes_destino:
        # A permissão é nova (não estava no perfil) e o editor não a tem?
        if chave not in originais and chave not in editor_set:
            raise HTTPException(
                status_code=403,
                detail=f"Você não pode atribuir a permissão '{chave}' pois não a possui."
            )

def listar_perfis(db: Session):
    return db.query(Perfil).all()

def criar_perfil(db: Session, perfil: PerfilCriar):
    _validar_delegacao(perfil.permissoes, perfil.editor_permissoes)

    db_perfil = Perfil(nome=perfil.nome, descricao=perfil.descricao)
    
    if perfil.permissoes:
        permissoes_db = db.query(Permissao).filter(Permissao.chave.in_(perfil.permissoes)).all()
        db_perfil.permissoes = list(permissoes_db)
        
    db.add(db_perfil)
    db.commit()
    db.refresh(db_perfil)
    return db_perfil

def atualizar_perfil(db: Session, perfil_id: int, perfil_atualizado: PerfilCriar):
    db_perfil = db.query(Perfil).filter(Perfil.id == perfil_id).first()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado")

    # Regra: Nao alterar o Administrador
    if db_perfil.nome == "Administrador":
        raise HTTPException(status_code=403, detail="O perfil Administrador nao pode ser alterado via API.")

    # Validação de delegação: o editor só pode alterar permissões que ele possui
    permissoes_originais = {p.chave for p in db_perfil.permissoes}
    _validar_delegacao(perfil_atualizado.permissoes, perfil_atualizado.editor_permissoes, permissoes_originais)

    db_perfil.nome = perfil_atualizado.nome
    db_perfil.descricao = perfil_atualizado.descricao
    
    # Atualiza as permissões
    if perfil_atualizado.permissoes is not None:
        permissoes_db = db.query(Permissao).filter(Permissao.chave.in_(perfil_atualizado.permissoes)).all()
        db_perfil.permissoes = list(permissoes_db)
        
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