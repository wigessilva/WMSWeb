from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.enums import StatusRecebimento, StatusRecebimentoItem

class RecebimentoLeituraSchema(BaseModel):
    id: int
    ua: str
    qtd: float
    und: str
    ean: Optional[str] = None
    lote: Optional[str] = None
    data_validade: Optional[datetime] = None
    fator_conversao: float
    unidade_produto_id: Optional[int] = None
    descricao_visual: Optional[str] = None
    usuario: str
    data: datetime

    class Config:
        from_attributes = True

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
    cert_qual: Optional[str] = None
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
    leituras: List[RecebimentoLeituraSchema] = []
    
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

            # Adiciona os parâmetros do produto para validação no frontend (com herança da família)
            if produto:
                fam = produto.familia_relacao
                
                def get_param(name):
                    # Tenta no produto, se for None, tenta na família
                    val = getattr(produto, name, None)
                    if val is None and fam:
                        val = getattr(fam, name, None)
                    return val

                ret['lote_obrigatorio'] = get_param('lote_obrigatorio')
                ret['bloquear_sem_lote'] = get_param('bloquear_sem_lote')
                ret['bloquear_sem_validade'] = get_param('bloquear_sem_validade') or bool(get_param('tipo_validade'))
                ret['vencimento_minimo'] = get_param('vencimento_minimo')
            
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
    divergencia_financeira: Optional[str] = None
    dentro_da_tolerancia: bool = False
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
    int_embalagem: str
    int_material: str
    identificacao: str
    cert_qual: str
    leituras: List[ConferenciaItemLeitura]