from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.endereco import EnderecoLoteCriar, EnderecoDetalhadoSchema, EnderecoAtualizar
from app.services.endereco_service import EnderecoService

router = APIRouter()

@router.get("/", response_model=list[EnderecoDetalhadoSchema])
def listar_enderecos(db: Session = Depends(get_db)):
    return EnderecoService.listar_todos(db)

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

@router.put("/{endereco_id}")
def atualizar_endereco(endereco_id: int, dados: EnderecoAtualizar, db: Session = Depends(get_db)):
    try:
        endereco = EnderecoService.atualizar(db=db, endereco_id=endereco_id, dados=dados)
        return endereco
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{endereco_id}")
def excluir_endereco(endereco_id: int, db: Session = Depends(get_db)):
    try:
        EnderecoService.excluir(db=db, endereco_id=endereco_id)
        return {"mensagem": "Endereço excluído com sucesso."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))