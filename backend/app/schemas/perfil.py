from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PerfilBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    permite_liberar_sem_oc: bool = False

class PerfilCriar(PerfilBase):
    pass

class PerfilSchema(PerfilBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True