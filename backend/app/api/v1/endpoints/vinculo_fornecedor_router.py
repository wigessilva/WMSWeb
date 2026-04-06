from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.schemas.vinculo_fornecedor import VinculoFornecedorList
from app.services.vinculo_fornecedor_service import VinculoFornecedorService

router = APIRouter()

@router.get("/", response_model=List[VinculoFornecedorList])
def listar_vinculos(termo: Optional[str] = Query(None, description="Termo de busca"), db: Session = Depends(get_db)):
    return VinculoFornecedorService.listar_vinculos(db, termo)

@router.delete("/{id}")
def excluir_vinculo(id: int, db: Session = Depends(get_db)):
    try:
        return VinculoFornecedorService.excluir_vinculo(db, id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
