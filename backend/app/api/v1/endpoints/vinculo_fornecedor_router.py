from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ....db.database import get_db
from ....schemas.vinculo_fornecedor import SugestaoVinculoRequest, SalvarVinculoRequest
from ....services.vinculo_fornecedor_service import vinculo_fornecedor_service

router = APIRouter()

@router.post("/sugerir")
def sugerir_vinculo(request: SugestaoVinculoRequest, db: Session = Depends(get_db)):
    try:
        produto_id = vinculo_fornecedor_service.sugerir_sku_heuristica(db, request.model_dump())
        return {"produto_id_sugerido": produto_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/salvar")
def salvar_vinculo(request: SalvarVinculoRequest, db: Session = Depends(get_db)):
    try:
        # Fixo "Sistema" provisoriamente ate passar o token do utilizador real logado
        vinculo_fornecedor_service.salvar_vinculo(
            db, request.produto_id, request.codigo_fornecedor, request.cnpj_fornecedor, "Sistema"
        )
        return {"sucesso": True, "mensagem": "Vinculo guardado com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))