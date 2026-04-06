from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .produto import ProdutoSchema

class VinculoFornecedorBase(BaseModel):
    codigo_fornecedor: str
    cnpj_fornecedor: str
    produto_id: int

class VinculoFornecedorCriar(VinculoFornecedorBase):
    pass

class VinculoFornecedorAtualizar(BaseModel):
    produto_id: Optional[int] = None
    codigo_fornecedor: Optional[str] = None
    cnpj_fornecedor: Optional[str] = None

class VinculoFornecedorSchema(VinculoFornecedorBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    criado_por: Optional[str] = None
    
    # Optional fields for UI display
    produto: Optional[ProdutoSchema] = None

    model_config = ConfigDict(from_attributes=True)

class VinculoFornecedorList(BaseModel):
    id: int
    sku: str
    descricao: str
    codigoFornecedor: str
    cnpjFornecedor: str
    criadoPor: Optional[str] = None
