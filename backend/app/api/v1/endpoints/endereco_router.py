from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.endereco import EnderecoLoteCriar
from app.services.endereco_service import EnderecoService

router = APIRouter()

@router.post("/gerar-lote")
def gerar_enderecos_lote(dados: EnderecoLoteCriar, db: Session = Depends(get_db)):
    try:
        quantidade = EnderecoService.gerar_em_lote(db=db, dados=dados)
        return {"mensagem": f"{quantidade} endereços gerados com sucesso no armazém."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Faz rollback caso haja conflito de códigos únicos já existentes na base
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro ao gerar lote. Verifique se estes endereços já existem.")