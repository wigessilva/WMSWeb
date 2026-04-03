from pydantic import BaseModel
from datetime import datetime

class UnidadeMedidaBase(BaseModel):
    sigla: str
    desc: str
    decimais: bool = False

class UnidadeMedidaCriar(UnidadeMedidaBase):
    pass

class UnidadeMedidaSchema(UnidadeMedidaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True # Permite ler do SQLAlchemy


class UnidadeMedidaAtualizarDecimais(BaseModel):
    decimais: bool