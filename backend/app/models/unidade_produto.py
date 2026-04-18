from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class UnidadeProduto(Base):
    __tablename__ = "UnidadesProduto"

    id = Column("Id", Integer, primary_key=True, index=True)
    erp_id = Column("ErpId", Integer, nullable=True)

    # Importante: a ForeignKey agora aponta para "produtos.Id" com "I" maiúsculo
    produto_id = Column("ProdutoId", Integer, ForeignKey("Produtos.Id"), nullable=False)

    # Tipo: base, produto ou recipiente
    tipo = Column("Tipo", String(20), nullable=False)

    # Chave estrangeira apontando para a unidade de medida real
    unidade_medida_id = Column("UnidadeMedidaId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=False)

    # Fator de conversão: Unidade Base sempre é 1.0
    fator_conversao = Column("FatorConversao", Float, default=1.0, nullable=False)

    # Medidas e Peso
    peso_bruto = Column("PesoBruto", Float, nullable=True)
    largura = Column("Largura", Float, nullable=True)
    largura_unidade_id = Column("LarguraUnidadeId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=True)
    comprimento = Column("Comprimento", Float, nullable=True)
    comprimento_unidade_id = Column("ComprimentoUnidadeId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=True)
    altura = Column("Altura", Float, nullable=True)
    altura_unidade_id = Column("AlturaUnidadeId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=True)
    ean = Column("Ean", String(50), nullable=True)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    produto = relationship("Produto", back_populates="unidades")
    unidade_medida_relacao = relationship("UnidadeMedida", foreign_keys=[unidade_medida_id])
    largura_unidade_rel = relationship("UnidadeMedida", foreign_keys=[largura_unidade_id])
    comprimento_unidade_rel = relationship("UnidadeMedida", foreign_keys=[comprimento_unidade_id])
    altura_unidade_rel = relationship("UnidadeMedida", foreign_keys=[altura_unidade_id])

    __mapper_args__ = {
        "version_id_col": rowversion
    }