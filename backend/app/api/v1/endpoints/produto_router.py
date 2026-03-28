from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, get_erp_db
from app.schemas.produto import ProdutoSchema, ProdutoEditar, ProdutoAtivar, ProdutoBloqueio
from fastapi import Query
from app.services.produto_service import ProdutoService
from app.services.erp_sync_service import ServicoSincronizacaoERP

router = APIRouter()

@router.post("/sincronizar-erp")
def sincronizar_com_erp(db_wms: Session = Depends(get_db), db_erp: Session = Depends(get_erp_db)):
    # A rota puxa a sessão do WMS e a sessão do ERP simultaneamente e injeta no serviço
    resultado = ServicoSincronizacaoERP.sincronizar_produtos(db_wms=db_wms, db_erp=db_erp)
    return resultado

@router.put("/{produto_id}", response_model=ProdutoSchema)
def editar_produto(produto_id: int, produto: ProdutoEditar, db: Session = Depends(get_db)):
    produto_atualizado = ProdutoService.editar_produto(db=db, produto_id=produto_id, produto_dados=produto)
    if not produto_atualizado:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto_atualizado

@router.get("/", response_model=list[ProdutoSchema])
def listar_produtos(db: Session = Depends(get_db)):
    return ProdutoService.listar_todos(db)

@router.post("/{produto_id}/ativar", response_model=ProdutoSchema)
def ativar_produto_wms(produto_id: int, dados: ProdutoAtivar, db: Session = Depends(get_db)):
    produto_ativado = ProdutoService.ativar_produto(db=db, produto_id=produto_id, dados_ativacao=dados)
    if not produto_ativado:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto_ativado

@router.patch("/{produto_id}/status", response_model=ProdutoSchema)
def alterar_status_produto(
    produto_id: int,
    status: str = Query(..., description="Novo status: ativo, inativo ou pendente"),
    db: Session = Depends(get_db)
):
    try:
        return ProdutoService.alterar_status(db, produto_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{produto_id}/bloqueio", response_model=ProdutoSchema)
def bloquear_desbloquear_produto(produto_id: int, dados: ProdutoBloqueio, db: Session = Depends(get_db)):
    try:
        return ProdutoService.alterar_bloqueio(db, produto_id, dados)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))