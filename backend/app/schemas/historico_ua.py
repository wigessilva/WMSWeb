from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HistoricoUABase(BaseModel):
    ua_id: int
    tipo_acao: str
    origem_endereco_id: Optional[int] = None
    destino_endereco_id: Optional[int] = None
    observacoes: Optional[str] = None

class HistoricoUACriar(HistoricoUABase):
    pass

class HistoricoUASchema(HistoricoUABase):
    id: int
    criado_em: datetime
    # Os campos de quem criou permanecem nulos por enquanto
    criado_por: Optional[str] = None
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True