from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Recebimento(Base):
    __tablename__ = "Recebimentos"

    # Este ID é o seu Romaneio (auto-incremento 1, 2, 3...)
    id = Column("Id", Integer, primary_key=True, index=True)
    nfe = Column("NFe", String(50), nullable=False)
    oc = Column("OC", String(50), nullable=True)
    fornecedor = Column("Fornecedor", String(150), nullable=False)
    conferente = Column("Conferente", String(100), nullable=True)

    autorizado_por = Column("AutorizadoPor", String(100), nullable=True)
    autorizado_em = Column("AutorizadoEm", DateTime, nullable=True)

    inicio = Column("Inicio", DateTime, nullable=True)
    conclusao = Column("Conclusao", DateTime, nullable=True)

    status = Column("Status", String(50), default="Importado", nullable=False)
    divergencia_financeira = Column("DivergenciaFinanceira", String(1000), nullable=True)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamento 1 para N (Um romaneio tem vários itens)
    itens = relationship("RecebimentoItem", back_populates="recebimento", cascade="all, delete-orphan")

    __mapper_args__ = {
        "version_id_col": rowversion
    }


class RecebimentoItem(Base):
    __tablename__ = "RecebimentoItens"

    id = Column("Id", Integer, primary_key=True, index=True)
    recebimento_id = Column("RecebimentoId", Integer, ForeignKey("Recebimentos.Id"), nullable=False)

    # O SKU nasce nulo e aguarda o vínculo (De/Para) do usuário
    sku = Column("Sku", Integer, ForeignKey("Produtos.Id"), nullable=True)

    codigo_fornecedor = Column("CodigoFornecedor", String(100), nullable=True)

    descricao = Column("Descricao", String(255), nullable=False)
    qtd_nota = Column("QtdNota", Float, nullable=False)
    valor_unitario = Column("ValorUnitario", Float, nullable=True)
    qtd_recebida = Column("QtdRecebida", Float, nullable=True)
    und = Column("Und", String(20), nullable=False)

    # Rastreabilidade e Qualidade
    lote = Column("Lote", String(50), nullable=True)
    fab = Column("Fab", DateTime, nullable=True)
    val = Column("Val", DateTime, nullable=True)
    vencimento = Column("Vencimento", String(20), nullable=True)

    int_embalagem = Column("IntEmbalagem", String(20), nullable=True)
    int_material = Column("IntMaterial", String(20), nullable=True)
    identificacao = Column("Identificacao", String(100), nullable=True)
    cert_qual = Column("CertifQual", String(10), nullable=True)

    # Direcionamento (Cross-docking para outra filial, por exemplo)
    destino_id = Column("DestinoId", Integer, ForeignKey("Filiais.Id"), nullable=True)

    status = Column("Status", String(50), default="Pendente", nullable=False)
    tentativas = Column("Tentativas", Integer, default=0, nullable=False)

    # Relacionamentos
    recebimento = relationship("Recebimento", back_populates="itens")
    produto = relationship("Produto")
    destino = relationship("Filial")
    leituras = relationship("RecebimentoLeitura", back_populates="item", cascade="all, delete-orphan")

class RecebimentoLeitura(Base):
    __tablename__ = "RecebimentoLeituras"

    id = Column("Id", Integer, primary_key=True, index=True)
    recebimento_item_id = Column("RecebimentoItemId", Integer, ForeignKey("RecebimentoItens.Id"), nullable=False)
    qtd = Column("Qtd", Float, nullable=False)
    und = Column("Und", String(20), nullable=False)
    ean = Column("Ean", String(50), nullable=True)
    usuario = Column("Usuario", String(100), nullable=False)
    data = Column("Data", DateTime, default=datetime.now, nullable=False)
    ua = Column("UA", String(100), nullable=True)
    descricao_visual = Column("DescricaoVisual", String(255), nullable=True)

    item = relationship("RecebimentoItem", back_populates="leituras")