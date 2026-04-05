from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class Recebimento(Base):
    __tablename__ = "Recebimentos"

    # Este ID é o seu Romaneio (auto-incremento 1, 2, 3...)
    id = Column("Id", Integer, primary_key=True, index=True)
    nfe = Column("NFe", String(50), nullable=False)
    oc = Column("OC", String(100), nullable=True)
    fornecedor = Column("Fornecedor", String(150), nullable=False)
    conferente = Column("Conferente", String(100), nullable=True)

    inicio = Column("Inicio", DateTime, nullable=True)
    conclusao = Column("Conclusao", DateTime, nullable=True)

    status = Column("Status", String(50), default="Importado", nullable=False)

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

    # Código original do produto como vem no XML (tag cProd)
    codigo_fornecedor = Column("CodigoFornecedor", String(100), nullable=True)

    descricao = Column("Descricao", String(255), nullable=False)
    qtd_nota = Column("QtdNota", Float, nullable=False)
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
    certif_qual = Column("CertifQual", String(10), nullable=True)

    # Direcionamento (Cross-docking para outra filial, por exemplo)
    destino_id = Column("DestinoId", Integer, ForeignKey("Filiais.Id"), nullable=True)

    status = Column("Status", String(50), default="Pendente", nullable=False)

    # Relacionamentos
    recebimento = relationship("Recebimento", back_populates="itens")
    produto = relationship("Produto")
    destino = relationship("Filial")