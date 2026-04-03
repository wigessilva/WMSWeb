from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class Produto(Base):
    __tablename__ = "Produtos"

    id = Column("Id", Integer, primary_key=True, index=True)
    sku = Column("Sku", String(50), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=False)
    referencia = Column("Referencia", String(100), nullable=True)  # Vem da coluna Ref do ERP

    # Chave estrangeira ligando à tabela de famílias
    familia_id = Column("FamiliaId", Integer, ForeignKey("Familias.Id"), nullable=True)

    variavel_consumo = Column("VariavelConsumo", String(20), nullable=True)

    unidade_medida_id = Column("UnidadeMedidaId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=True)

    # Ciclo de Vida Comercial
    status = Column("Status", String(50), default="pendente")

    # Controle de Qualidade (Chão de Fábrica)
    bloqueado = Column("Bloqueado", Boolean, default=False)
    motivo_bloqueio = Column("MotivoBloqueio", String(255), nullable=True)

    largura_mm = Column("LarguraMm", Float, nullable=True)
    comprimento_m = Column("ComprimentoM", Float, nullable=True)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamentos
    familia_relacao = relationship("Familia")
    unidade_medida_relacao = relationship("UnidadeMedida")
    unidades = relationship("UnidadeProduto", back_populates="produto", cascade="all, delete-orphan")

    # Configuração para controlo de concorrência
    __mapper_args__ = {
        "version_id_col": rowversion
    }

    def calcular_area_total(self):
        if self.largura_mm and self.comprimento_m:
            return (self.largura_mm / 1000) * self.comprimento_m
        return 0.0