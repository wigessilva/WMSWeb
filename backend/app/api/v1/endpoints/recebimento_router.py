from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.db.database import get_db, get_erp_db
from app.schemas.recebimento import RecebimentoCriar, RecebimentoSchema
from app.services.recebimento_service import RecebimentoService
from app.models.recebimento import Recebimento, RecebimentoItem

router = APIRouter()

# --- NOVA ROTA DE LISTAGEM ---
@router.get("/", response_model=List[RecebimentoSchema])
def listar_recebimentos(termo: Optional[str] = Query(None, description="Termo de busca geral"), db: Session = Depends(get_db)):
    query = db.query(Recebimento)

    if termo:
        # Busca em campos do cabeçalho e verifica se algum item do romaneio corresponde
        query = query.outerjoin(Recebimento.itens).filter(
            or_(
                Recebimento.nfe.ilike(f"%{termo}%"),
                Recebimento.fornecedor.ilike(f"%{termo}%"),
                Recebimento.oc.ilike(f"%{termo}%"),
                RecebimentoItem.descricao.ilike(f"%{termo}%"),
                RecebimentoItem.lote.ilike(f"%{termo}%")
            )
        ).distinct() # Distinct impede que o romaneio se repita se o termo for achado em 2 itens dele

    return query.order_by(Recebimento.criado_em.desc()).all()

@router.post("/importar", response_model=RecebimentoSchema)
def importar_romaneio(
    dados: RecebimentoCriar,
    cnpj_fornecedor: str = Query(..., description="CNPJ do Fornecedor para o motor de De/Para"),
    db: Session = Depends(get_db),
    db_erp: Session = Depends(get_erp_db) # Injetando a conexão com o ERP
):
    return RecebimentoService.importar_xml(db=db, db_erp=db_erp, dados=dados, cnpj_fornecedor=cnpj_fornecedor)

@router.post("/{id}/liberar", response_model=RecebimentoSchema)
def liberar_romaneio(id: int = Path(...), db: Session = Depends(get_db)):
    try:
        return RecebimentoService.liberar_romaneio(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/concluir-doca", response_model=RecebimentoSchema)
def concluir_doca(id: int = Path(...), db: Session = Depends(get_db)):
    try:
        return RecebimentoService.concluir_doca(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/finalizar", response_model=RecebimentoSchema)
def finalizar_recebimento_fiscal(id: int = Path(...), db: Session = Depends(get_db)):
    try:
        return RecebimentoService.finalizar_recebimento_fiscal(db=db, recebimento_id=id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/vincular-oc", response_model=RecebimentoSchema)
def vincular_oc(
    id: int = Path(...),
    oc: str = Query(..., description="Número da OC encontrada no ERP"),
    db: Session = Depends(get_db),
    db_erp: Session = Depends(get_erp_db) # Injetando a conexão do ERP_DB
):
    try:
        return RecebimentoService.vincular_oc(db_wms=db, db_erp=db_erp, recebimento_id=id, oc=oc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/vincular-unidade", response_model=RecebimentoSchema)
def vincular_unidade(
    id: int = Path(...),
    unidade_externa: str = Query(..., description="Unidade externa da NFe"),
    unidade_medida_id: int = Query(..., description="ID da unidade de medida interna correspondente"),
    db: Session = Depends(get_db)
):
    try:
        return RecebimentoService.vincular_unidade_pendente(
            db=db,
            recebimento_id=id,
            unidade_externa=unidade_externa,
            unidade_medida_id=unidade_medida_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sincronizar-ocs", response_model=dict)
def sincronizar_ocs(
    db: Session = Depends(get_db),
    db_erp: Session = Depends(get_erp_db)
):
    return RecebimentoService.sincronizar_ocs_pendentes(db_wms=db, db_erp=db_erp)