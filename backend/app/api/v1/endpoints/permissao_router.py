from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from collections import defaultdict

from app.db.database import get_db
from app.models.permissao import Permissao

router = APIRouter()

@router.get("/", response_model=Dict[str, List[dict]])
def listar_permissoes_agrupadas(db: Session = Depends(get_db)):
    """Retorna todas as permissões do sistema agrupadas por módulo."""
    permissoes = db.query(Permissao).order_by(Permissao.chave).all()
    
    agrupadas = defaultdict(list)
    for p in permissoes:
        modulo = p.chave.split(".")[0] if "." in p.chave else "OUTROS"
        agrupadas[modulo].append({
            "id": p.id,
            "chave": p.chave,
            "descricao": p.descricao
        })
    
    return dict(agrupadas)
