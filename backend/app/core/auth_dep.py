from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models.usuario import Usuario

def get_current_user_active(
    x_session_token: str = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
) -> Usuario:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Token de sessão não fornecido.")
    
    usuario = db.query(Usuario).filter(Usuario.token_sessao == x_session_token).first()
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada em outro dispositivo.")
        
    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo.")
        
    return usuario
