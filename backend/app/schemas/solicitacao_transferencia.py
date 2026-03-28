from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SolicitacaoTransferenciaBase(BaseModel):
    filial_requisitante_id: int
    filial_atendente_id: int
    produto_id: int
    quantidade_solicitada: float = Field(gt=0, description="A quantidade deve ser maior que zero")

class SolicitacaoTransferenciaCriar(SolicitacaoTransferenciaBase):
    pass

class SolicitacaoTransferenciaSchema(SolicitacaoTransferenciaBase):
    id: int
    quantidade_atendida: float
    status: str
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True


# Schema para editar um pedido (só a quantidade pode ser alterada)
class SolicitacaoTransferenciaEditar(BaseModel):
    quantidade_solicitada: float = Field(gt=0, description="Nova quantidade solicitada")


# Schema genérico para ações como Cancelar ou "Perdoar/Encerrar"
class SolicitacaoTransferenciaAcao(BaseModel):
    motivo: Optional[str] = Field(None, description="Motivo da ação (opcional)")