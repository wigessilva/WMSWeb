from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.enums import StatusRecebimento, StatusRecebimentoItem

# # FORMULÁRIOS DOS ITENS
class RecebimentoItemBase(BaseModel):
    descricao: str
    qtd_nota: float
    valor_unitario: Optional[float] = None
    und: str
    sku: Optional[int] = None
    codigo_fornecedor: Optional[str] = None
    qtd_recebida: Optional[float] = None
    lote: Optional[str] = None
    fab: Optional[datetime] = None
    val: Optional[datetime] = None
    vencimento: Optional[str] = None
    int_embalagem: Optional[str] = None
    int_material: Optional[str] = None
    identificacao: Optional[str] = None
    certif_qual: Optional[str] = None
    destino_id: Optional[int] = None
    status: StatusRecebimentoItem = StatusRecebimentoItem.PENDENTE_VINCULO

class RecebimentoItemCriar(RecebimentoItemBase):
    pass

from typing import Any
from pydantic import model_validator

class RecebimentoItemSchema(RecebimentoItemBase):
    id: int
    recebimento_id: int
    sku: Optional[str] = None
    produto_id: Optional[int] = None
    tentativas: int = 0
    descricoes_visuais: List[str] = []
    
    # Parâmetros de conferência do produto
    lote_obrigatorio: Optional[bool] = None
    bloquear_sem_lote: Optional[bool] = None
    bloquear_sem_validade: Optional[bool] = None
    vencimento_minimo: Optional[int] = None

    @model_validator(mode='before')
    @classmethod
    def convert_orm(cls, data: Any) -> Any:
        if not isinstance(data, dict) and hasattr(data, "__table__"):
            produto = getattr(data, 'produto', None)
            sku_real = produto.sku if produto else None
            
            # Pega as descrições visuais únicas de todas as leituras
            leituras = getattr(data, 'leituras', [])
            desc_visuais = list(set([l.descricao_visual for l in leituras if getattr(l, 'descricao_visual', None)]))

            # Copia os campos do ORM, filtrando nomes internos do SQLAlchemy
            ret = {k: v for k, v in data.__dict__.items() if not k.startswith('_')}
            ret['sku'] = sku_real
            ret['produto_id'] = getattr(data, 'sku', None) # No banco o campo Sku é o ID
            ret['descricoes_visuais'] = desc_visuais

            # Adiciona os parâmetros do produto para validação no frontend
            if produto:
                ret['lote_obrigatorio'] = getattr(produto, 'lote_obrigatorio', None)
                ret['bloquear_sem_lote'] = getattr(produto, 'bloquear_sem_lote', None)
                ret['bloquear_sem_validade'] = getattr(produto, 'bloquear_sem_validade', None)
                ret['vencimento_minimo'] = getattr(produto, 'vencimento_minimo', None)
            
            return ret
        return data

    class Config:
        from_attributes = True

# # FORMULÁRIOS DO ROMANEIO (CABEÇALHO)
class RecebimentoBase(BaseModel):
    nfe: str
    oc: Optional[str] = None
    fornecedor: str
    conferente: Optional[str] = None
    autorizado_por: Optional[str] = None
    autorizado_em: Optional[datetime] = None
    status: StatusRecebimento = StatusRecebimento.IMPORTADO

class AutorizacaoPayload(BaseModel):
    login_autorizador: str
    senha_autorizador: str

class RecebimentoCriar(RecebimentoBase):
    itens: List[RecebimentoItemCriar]

class RecebimentoSchema(RecebimentoBase):
    id: int
    inicio: Optional[datetime] = None
    conclusao: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    itens: List[RecebimentoItemSchema] = []

    class Config:
        from_attributes = True

# Schemas para Conclusão de Conferência
class ConferenciaItemLeitura(BaseModel):
    ua: str
    quantidade: float
    unidade_produto_id: Optional[int] = None
    fator_conversao: float = 1.0
    lote: Optional[str] = None
    data_validade: Optional[str] = None
    und: str # Sigla da unidade usada no momento do bipe
    ean: Optional[str] = None
    descricao_visual: Optional[str] = None

class ConclusaoItemSchema(BaseModel):
    tentativas: int
    status_final: str # 'CONFERIDO' ou 'DIVERGENTE'
    leituras: List[ConferenciaItemLeitura]