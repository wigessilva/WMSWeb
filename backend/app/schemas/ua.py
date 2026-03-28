from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime


class UABase(BaseModel):
    filial_id: int
    filial_destino_id: Optional[int] = None
    produto_id: Optional[int] = None
    lote: Optional[str] = None
    data_validade: Optional[datetime] = None
    quantidade: Optional[float] = None
    unidade_produto_id: Optional[int] = None
    endereco_id: Optional[int] = None

    largura: Optional[float] = None
    comprimento: Optional[float] = None
    altura: Optional[float] = None

    estado: str = Field(default="Bom")
    observacoes: Optional[str] = None

    # Validador de segurança
    @field_validator('estado')
    @classmethod
    def validar_estado(cls, v):
        if v not in ["Bom", "Ruim"]:
            raise ValueError("O estado da UA deve ser estritamente 'Bom' ou 'Ruim'.")
        return v

    # O "Cérebro" da UA Virgem
    @model_validator(mode='after')
    def validar_dependencias_produto(self):
        # Cenário 1: UA com Produto (Precisa ter quantidade e unidade)
        if self.produto_id is not None:
            if self.quantidade is None or self.unidade_produto_id is None:
                raise ValueError("Se a UA possui um produto, deve informar a 'quantidade' e a 'unidade_produto_id'.")
        # Cenário 2: UA Virgem (Não pode ter quantidade nem atributos de produto)
        else:
            if self.quantidade is not None or self.unidade_produto_id is not None or self.lote is not None:
                raise ValueError("Uma UA virgem não pode conter quantidade, unidade, lote ou validade. Deixe esses campos vazios.")
        return self


# Para a criação, não pedimos o código nem o status.
class UACriar(UABase):
    pass


# Schema para devolução dos dados (Leitura)
class UASchema(UABase):
    id: int
    codigo: str
    status: str
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int

    class Config:
        from_attributes = True


# Schema para quando a UA sai da filial de origem
class UAExpedirTransferencia(BaseModel):
    filial_destino_id: int
    observacoes: Optional[str] = None
    solicitacao_id: Optional[int] = None  # Opcional: só preenchido se a expedição for para atender um pedido


# Schema para quando a UA chega na filial de destino
class UAReceberTransferencia(BaseModel):
    observacoes: Optional[str] = None