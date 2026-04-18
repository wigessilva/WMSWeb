from pydantic import BaseModel, validator
from datetime import datetime

class UnidadeMedidaBase(BaseModel):
    sigla: str
    desc: str
    decimais: bool = False
    natureza: str = "Discreta"
    fator_conversao: float = 1.0

    @validator("fator_conversao")
    def fator_positivo(cls, v):
        if v <= 0:
            raise ValueError("O fator de conversão deve ser maior que zero")
        return v

class UnidadeMedidaCriar(UnidadeMedidaBase):
    pass

class UnidadeMedidaSchema(UnidadeMedidaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True # Permite ler do SQLAlchemy


class UnidadeMedidaUpdate(BaseModel):
    decimais: bool | None = None
    natureza: str | None = None
    fator_conversao: float | None = None
    usuario: str | None = None

    @validator("fator_conversao")
    def fator_positivo(cls, v):
        if v is not None and v <= 0:
            raise ValueError("O fator de conversão deve ser maior que zero")
        return v