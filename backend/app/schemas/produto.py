from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .unidade_produto import UnidadeProdutoCriar, UnidadeProdutoSchema

class ProdutoBase(BaseModel):
    sku: str
    descricao: str
    referencia: Optional[str] = None
    familia_id: Optional[int] = None
    herdar_regras_familia: bool = True
    unidade_medida_id: Optional[int] = None
    status: str = "pendente"
    largura_mm: Optional[float] = None
    comprimento_m: Optional[float] = None

# Schema usado na edição (PUT)
# SKU, Descrição e Referência não estão aqui para garantir que sejam Read-Only
class ProdutoEditar(BaseModel):
    familia_id: Optional[int] = None
    herdar_regras_familia: Optional[bool] = None
    unidade_medida_id: Optional[int] = None
    status: Optional[str] = None
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
    # Recebe a lista de unidades (Base, Produto, Recipiente)
    unidades: List[UnidadeProdutoCriar]