from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class FamiliaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    variavel_consumo: str = Field(default="unidade")
    herdar_parametros_mestres: bool = True
    validade_obrigatoria: Optional[bool] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None

class FamiliaCriar(FamiliaBase):
    pass

class FamiliaEditar(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    variavel_consumo: Optional[str] = None
    herdar_parametros_mestres: Optional[bool] = None
    validade_obrigatoria: Optional[bool] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
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