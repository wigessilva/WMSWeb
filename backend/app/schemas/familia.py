from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class FamiliaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    variavel_consumo: str = Field(default="unidade")
    tipo_validade: Optional[str] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v

    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    prazo_validade: Optional[int] = None
    vencimento_minimo: Optional[int] = None
    area_armazenagem_preferencial: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None
    fracionavel_recebimento: Optional[bool] = True

class FamiliaCriar(FamiliaBase):
    pass

class FamiliaEditar(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    variavel_consumo: Optional[str] = None
    tipo_validade: Optional[str] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    prazo_validade: Optional[int] = None
    vencimento_minimo: Optional[int] = None
    area_armazenagem_preferencial: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None
    fracionavel_recebimento: Optional[bool] = None

class FamiliaSchema(FamiliaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True