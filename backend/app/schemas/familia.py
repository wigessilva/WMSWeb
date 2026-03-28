from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FamiliaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    herdar_regras_globais: bool = True
    validade_obrigatoria: Optional[bool] = None
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None

class FamiliaCriar(FamiliaBase):
    pass

class FamiliaEditar(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    herdar_regras_globais: Optional[bool] = None
    validade_obrigatoria: Optional[bool] = None
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None

class FamiliaSchema(FamiliaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True