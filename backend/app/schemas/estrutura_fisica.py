from pydantic import BaseModel
from datetime import datetime

class EstruturaFisicaBase(BaseModel):
    nome: str
    comporta_palete: bool = False
    comporta_caixa: bool = False
    comporta_log: bool = False

class EstruturaFisicaCriar(EstruturaFisicaBase):
    pass

class EstruturaFisicaSchema(EstruturaFisicaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True