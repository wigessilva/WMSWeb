from pydantic import BaseModel
from datetime import datetime

class AreaBase(BaseModel):
    letra: str
    descricao: str

class AreaCriar(AreaBase):
    pass

class AreaSchema(AreaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True