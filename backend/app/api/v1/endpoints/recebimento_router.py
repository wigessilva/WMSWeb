from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db, get_erp_db
from app.schemas.recebimento import RecebimentoCriar, RecebimentoSchema
from app.services.recebimento_service import RecebimentoService
from app.models.recebimento import Recebimento

router = APIRouter()

# --- NOVA ROTA DE LISTAGEM ---
@router.get("/", response_model=List[RecebimentoSchema])
def listar_recebimentos(db: Session = Depends(get_db)):
    # Puxa todos os recebimentos ordenados do mais recente para o mais antigo
    return db.query(Recebimento).order_by(Recebimento.criado_em.desc()).all()

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

@router.post("/sincronizar-ocs", response_model=dict)
def sincronizar_ocs(
    db: Session = Depends(get_db),
    db_erp: Session = Depends(get_erp_db)
):
    return RecebimentoService.sincronizar_ocs_pendentes(db_wms=db, db_erp=db_erp)