from pydantic import BaseModel
from typing import Optional

class UnidadeProdutoBase(BaseModel):
    # tipo deve ser: 'base', 'produto', ou 'recipiente'
    tipo: str
    unidade_medida_id: int
    fator_conversao: float = 1.0
    peso_bruto: Optional[float] = None
    largura: Optional[float] = None
    comprimento: Optional[float] = None
    altura: Optional[float] = None

class UnidadeProdutoCriar(UnidadeProdutoBase):
    pass

class UnidadeProdutoSchema(UnidadeProdutoBase):
    id: int
    produto_id: int

    class Config:
        from_attributes = True