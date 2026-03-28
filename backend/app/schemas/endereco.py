from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# Schema para receber os parâmetros de geração em massa
class EnderecoLoteCriar(BaseModel):
    area_id: int
    rua_inicio: int
    rua_fim: int
    predio_inicio: int
    predio_fim: int
    nivel_inicio: int
    nivel_fim: int
    posicao_inicio: int
    posicao_fim: int

    estrutura_fisica_id: int
    finalidade_id: int
    peso_maximo_kg: float

    # Exclusivo para Picking Fixo
    produto_id: Optional[int] = None
    capacidade_maxima_und: Optional[int] = None


# Schema para devolver os dados na leitura
class EnderecoSchema(BaseModel):
    id: int
    area_id: int
    rua: int
    predio: int
    nivel: int
    posicao: int
    codigo_formatado: str
    estrutura_fisica_id: int
    finalidade_id: int
    peso_maximo_kg: float
    produto_id: Optional[int] = None
    capacidade_maxima_und: Optional[int] = None
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True