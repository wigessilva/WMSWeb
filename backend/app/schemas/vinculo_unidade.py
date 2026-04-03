from pydantic import BaseModel
from datetime import datetime

class VinculoUnidadeBase(BaseModel):
    unidade_externa: str
    unidade_medida_id: int

class VinculoUnidadeCriar(VinculoUnidadeBase):
    pass

class VinculoUnidadeSchema(VinculoUnidadeBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True