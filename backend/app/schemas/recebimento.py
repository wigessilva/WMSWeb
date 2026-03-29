from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.enums import StatusRecebimento, StatusRecebimentoItem

# # FORMULÁRIOS DOS ITENS
class RecebimentoItemBase(BaseModel):
    descricao: str
    qtd_nota: float
    und: str
    sku: Optional[int] = None
    qtd_recebida: Optional[float] = None
    lote: Optional[str] = None
    fab: Optional[datetime] = None
    val: Optional[datetime] = None
    vencimento: Optional[str] = None
    int_embalagem: Optional[str] = None
    int_material: Optional[str] = None
    identificacao: Optional[str] = None
    certif_qual: Optional[str] = None
    destino_id: Optional[int] = None
    status: StatusRecebimentoItem = StatusRecebimentoItem.PENDENTE_VINCULO

class RecebimentoItemCriar(RecebimentoItemBase):
    pass

class RecebimentoItemSchema(RecebimentoItemBase):
    id: int
    recebimento_id: int

    class Config:
        from_attributes = True

# # FORMULÁRIOS DO ROMANEIO (CABEÇALHO)
class RecebimentoBase(BaseModel):
    nfe: str
    oc: Optional[str] = None
    fornecedor: str
    conferente: Optional[str] = None
    status: StatusRecebimento = StatusRecebimento.IMPORTADO

class RecebimentoCriar(RecebimentoBase):
    itens: List[RecebimentoItemCriar]

class RecebimentoSchema(RecebimentoBase):
    id: int
    inicio: Optional[datetime] = None
    conclusao: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    itens: List[RecebimentoItemSchema] = []

    class Config:
        from_attributes = True