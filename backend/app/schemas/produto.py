from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from .unidade_produto import UnidadeProdutoCriar, UnidadeProdutoSchema

class ProdutoBase(BaseModel):
    sku: str
    descricao: str
    referencia: Optional[str] = None
    familia_id: Optional[int] = None
    variavel_consumo: Optional[str] = None
    tipo_validade: Optional[str] = None
    prazo_validade: Optional[int] = None
    vencimento_minimo: Optional[int] = None
    area_armazenagem_preferencial: Optional[str] = None
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None
    unidade_medida_id: Optional[int] = None
    status: str = "pendente"

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    largura_mm: Optional[float] = None
    comprimento_m: Optional[float] = None

# Schema usado na edição (PUT)
# SKU, Descrição e Referência não estão aqui para garantir que sejam Read-Only
class ProdutoEditar(BaseModel):
    familia_id: Optional[int] = None
    status: Optional[str] = None
    bloqueado: Optional[bool] = None
    motivo_bloqueio: Optional[str] = None
    codigo_fornecedor: Optional[str] = None
    variavel_consumo: Optional[str] = None
    tipo_validade: Optional[str] = None
    prazo_validade: Optional[int] = None
    vencimento_minimo: Optional[int] = None
    area_armazenagem_preferencial: Optional[str] = None
    lote_obrigatorio: Optional[bool] = None
    modelo_giro: Optional[str] = None
    bloquear_vencido: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None
    bloquear_reprovado: Optional[bool] = None
    unidade_medida_id: Optional[int] = None
    status: Optional[str] = None

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v
    largura_mm: Optional[float] = None
    comprimento_m: Optional[float] = None

# Schema usado na resposta da API (Leitura)
class ProdutoSchema(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    bloqueado: bool
    motivo_bloqueio: Optional[str] = None

    class Config:
        from_attributes = True # Permite que o Pydantic leia modelos do SQLAlchemy


class ProdutoAtivar(BaseModel):
    familia_id: int
    variavel_consumo: Optional[str] = None
    # Recebe a lista de unidades (Base, Produto, Recipiente)
    unidades: List[UnidadeProdutoCriar]

    @field_validator('variavel_consumo')
    @classmethod
    def validar_variavel(cls, v):
        if v is not None and v not in ["unidade", "largura", "comprimento", "peso"]:
            raise ValueError("Variavel de consumo deve ser: unidade, largura, comprimento ou peso.")
        return v


# Schema dedicado para a ação de Bloquear/Desbloquear
class ProdutoBloqueio(BaseModel):
    bloqueado: bool
    motivo_bloqueio: Optional[str] = None

    @model_validator(mode='after')
    def validar_motivo(self):
        # Obriga a ter motivo se for bloqueio
        if self.bloqueado and not self.motivo_bloqueio:
            raise ValueError("É obrigatório informar o motivo para bloquear o produto.")

        # Limpa o motivo automaticamente se for um desbloqueio
        if not self.bloqueado:
            self.motivo_bloqueio = None

        return self