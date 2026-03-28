from pydantic import BaseModel
from datetime import datetime

class FinalidadeEnderecoBase(BaseModel):
    nome: str
    tipo_pulmao: bool = False
    tipo_picking: bool = False
    tipo_quarentena: bool = False

class FinalidadeEnderecoCriar(FinalidadeEnderecoBase):
    pass

class FinalidadeEnderecoSchema(FinalidadeEnderecoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True