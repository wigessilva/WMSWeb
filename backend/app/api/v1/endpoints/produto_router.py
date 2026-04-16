from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, get_erp_db
from app.schemas.produto import ProdutoSchema, ProdutoEditar, ProdutoAtivar, ProdutoBloqueio, Optional
from app.schemas.unidade_produto import UnidadeProdutoEditar, UnidadeProdutoSchema
from fastapi import Query
from app.services.produto_service import ProdutoService
from app.services.erp_sync_service import ServicoSincronizacaoERP

from app.core.auth_dep import get_current_user_active

router = APIRouter(dependencies=[Depends(get_current_user_active)])


@router.post("/sincronizar-erp")
def sincronizar_com_erp(db_wms: Session = Depends(get_db), db_erp: Session = Depends(get_erp_db)):
    # Sincroniza produtos básicos
    res_produtos = ServicoSincronizacaoERP.sincronizar_produtos(db_wms=db_wms, db_erp=db_erp)

    # Sincroniza as unidades e fatores de conversão
    res_unidades = ServicoSincronizacaoERP.sincronizar_produtos_unidades(db_wms=db_wms, db_erp=db_erp)

    return {
        "produtos": res_produtos,
        "unidades": res_unidades
    }

@router.put("/{produto_id}", response_model=ProdutoSchema)
def editar_produto(produto_id: int, produto: ProdutoEditar, db: Session = Depends(get_db)):
    produto_atualizado = ProdutoService.editar_produto(db=db, produto_id=produto_id, produto_dados=produto)
    if not produto_atualizado:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto_atualizado

@router.get("/", response_model=list[ProdutoSchema])
def listar_produtos(
    busca: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Passamos o termo de busca para o service decidir como filtrar
    return ProdutoService.listar_todos(db, busca=busca)

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

@router.put("/unidade/{unidade_id}", response_model=UnidadeProdutoSchema)
def editar_unidade_produto(unidade_id: int, dados: UnidadeProdutoEditar, db: Session = Depends(get_db)):
    unidade = ProdutoService.editar_unidade(db, unidade_id, dados)
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    return unidade

@router.get("/{produto_id}/unidades", response_model=list[UnidadeProdutoSchema])
def listar_unidades_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = ProdutoService.buscar_por_id(db, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto.unidades