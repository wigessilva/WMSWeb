from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ParametrosMestresBase(BaseModel):
    validade_obrigatoria: bool = False
    lote_obrigatorio: bool = False
    modelo_giro: str = "FEFO"
    bloquear_vencido: bool = True
    bloquear_reprovado: bool = True
    bloquear_sem_validade: bool = False
    bloquear_sem_lote: bool = False

class ParametrosMestresEditar(BaseModel):
    validade_obrigatoria: Optional[bool] = None
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None

class ParametrosMestresSchema(ParametrosMestresBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True # Permite ler do modelo SQLAlchemy