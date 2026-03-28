from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from .unidade_produto import UnidadeProdutoCriar, UnidadeProdutoSchema

class ProdutoBase(BaseModel):
    sku: str
    descricao: str
    referencia: Optional[str] = None
    familia_id: Optional[int] = None
    herdar_regras_familia: bool = True
    variavel_consumo: Optional[str] = None
    unidade_medida_id: Optional[int] = None
    status: str = "pendente"

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    largura_mm: Optional[float] = None
    comprimento_m: Optional[float] = None

# Schema usado na edição (PUT)
# SKU, Descrição e Referência não estão aqui para garantir que sejam Read-Only
class ProdutoEditar(BaseModel):
    familia_id: Optional[int] = None
    herdar_regras_familia: Optional[bool] = None
    variavel_consumo: Optional[str] = None
    unidade_medida_id: Optional[int] = None
    status: Optional[str] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    largura_mm: Optional[float] = None
    comprimento_m: Optional[float] = None

# Schema usado na resposta da API (Leitura)
class ProdutoSchema(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True # Permite que o Pydantic leia modelos do SQLAlchemy


# Adicione no final do arquivo produto.py
class ProdutoAtivar(BaseModel):
    familia_id: int
    herdar_regras_familia: bool = True
    variavel_consumo: Optional[str] = None
    # Recebe a lista de unidades (Base, Produto, Recipiente)
    unidades: List[UnidadeProdutoCriar]

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v