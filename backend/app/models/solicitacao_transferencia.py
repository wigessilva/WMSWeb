from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class SolicitacaoTransferencia(Base):
    __tablename__ = "SolicitacoesTransferencia"

    id = Column("Id", Integer, primary_key=True, index=True)

    # Quem pede e quem atende
    filial_requisitante_id = Column("FilialRequisitanteId", Integer, ForeignKey("Filiais.Id"), nullable=False)
    filial_atendente_id = Column("FilialAtendenteId", Integer, ForeignKey("Filiais.Id"), nullable=False)

    # O que está a ser pedido
    produto_id = Column("ProdutoId", Integer, ForeignKey("Produtos.Id"), nullable=False)

    # Quantidades (Float para suportar peso, comprimento, largura ou unidade)
    quantidade_solicitada = Column("QuantidadeSolicitada", Float, nullable=False)
    quantidade_atendida = Column("QuantidadeAtendida", Float, default=0.0, nullable=False)

    # Controle de fluxo: pendente, em_separacao, transito, finalizada, cancelada
    status = Column("Status", String(50), default="pendente", nullable=False)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamentos
    filial_requisitante = relationship("Filial", foreign_keys=[filial_requisitante_id])
    filial_atendente = relationship("Filial", foreign_keys=[filial_atendente_id])
    produto = relationship("Produto")

    __mapper_args__ = {
        "version_id_col": rowversion
    }