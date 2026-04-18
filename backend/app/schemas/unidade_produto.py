from pydantic import BaseModel
from typing import Optional


# Schema auxiliar para trazer a sigla do banco de dados
class UnidadeMedidaRelacaoSchema(BaseModel):
    sigla: str
    natureza: str

    class Config:
        from_attributes = True

class UnidadeProdutoBase(BaseModel):
    # tipo deve ser: 'base', 'produto', ou 'recipiente'
    tipo: str
    unidade_medida_id: int
    fator_conversao: float = 1.0
    peso_bruto: Optional[float] = None
    largura: Optional[float] = None
    largura_unidade_id: Optional[int] = None
    comprimento: Optional[float] = None
    comprimento_unidade_id: Optional[int] = None
    altura: Optional[float] = None
    altura_unidade_id: Optional[int] = None
    ean: Optional[str] = None


class UnidadeProdutoEditar(BaseModel):
    tipo: Optional[str] = None
    largura: Optional[float] = None
    largura_unidade_id: Optional[int] = None
    comprimento: Optional[float] = None
    comprimento_unidade_id: Optional[int] = None
    altura: Optional[float] = None
    altura_unidade_id: Optional[int] = None
    peso_bruto: Optional[float] = None
    ean: Optional[str] = None


class UnidadeProdutoCriar(UnidadeProdutoBase):
    pass

class UnidadeProdutoSchema(UnidadeProdutoBase):
    id: int
    produto_id: int
    unidade_medida_relacao: Optional[UnidadeMedidaRelacaoSchema] = None
    largura_unidade_rel: Optional[UnidadeMedidaRelacaoSchema] = None
    comprimento_unidade_rel: Optional[UnidadeMedidaRelacaoSchema] = None
    altura_unidade_rel: Optional[UnidadeMedidaRelacaoSchema] = None

    class Config:
        from_attributes = True