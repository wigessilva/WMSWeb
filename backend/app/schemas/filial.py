from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FilialBase(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    is_matriz: bool = False
    ativo: bool = True

class FilialCriar(FilialBase):
    pass

class FilialSchema(FilialBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True