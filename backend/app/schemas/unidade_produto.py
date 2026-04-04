from pydantic import BaseModel
from typing import Optional


# Schema auxiliar para trazer a sigla do banco de dados
class UnidadeMedidaRelacaoSchema(BaseModel):
    sigla: str

    class Config:
        from_attributes = True

class UnidadeProdutoBase(BaseModel):
    # tipo deve ser: 'base', 'produto', ou 'recipiente'
    tipo: str
    unidade_medida_id: int
    fator_conversao: float = 1.0
    peso_bruto: Optional[float] = None
    largura: Optional[float] = None
    largura_unidade: Optional[str] = "mm"
    comprimento: Optional[float] = None
    comprimento_unidade: Optional[str] = "mm"
    altura: Optional[float] = None
    altura_unidade: Optional[str] = "mm"
    ean: Optional[str] = None


class UnidadeProdutoEditar(BaseModel):
    tipo: Optional[str] = None
    largura: Optional[float] = None
    largura_unidade: Optional[str] = None
    comprimento: Optional[float] = None
    comprimento_unidade: Optional[str] = None
    altura: Optional[float] = None
    altura_unidade: Optional[str] = None
    peso_bruto: Optional[float] = None
    ean: Optional[str] = None


class UnidadeProdutoCriar(UnidadeProdutoBase):
    pass

class UnidadeProdutoSchema(UnidadeProdutoBase):
    id: int
    produto_id: int
    unidade_medida_relacao: Optional[UnidadeMedidaRelacaoSchema] = None

    class Config:
        from_attributes = True