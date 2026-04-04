from pydantic import BaseModel
from typing import Optional

class SugestaoVinculoRequest(BaseModel):
    cnpj_fornecedor: str
    codigo_fornecedor: str
    unidade_nota: str
    quantidade_nota: float
    preco_unitario_nota: float
    xped: Optional[str] = None
    nitemped: Optional[str] = None

class SalvarVinculoRequest(BaseModel):
    produto_id: int
    codigo_fornecedor: str
    cnpj_fornecedor: str