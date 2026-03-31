from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Endereco(Base):
    __tablename__ = "Enderecos"

    id = Column("Id", Integer, primary_key=True, index=True)

    # Localização Física
    area_id = Column("AreaId", Integer, ForeignKey("Areas.Id"), nullable=False)
    rua = Column("Rua", Integer, nullable=False)
    predio = Column("Predio", Integer, nullable=False)
    nivel = Column("Nivel", Integer, nullable=False)
    posicao = Column("Posicao", Integer, nullable=False)

    # Código visual para o coletor bipar (Ex: A-01-12-03-05)
    codigo_formatado = Column("CodigoFormatado", String(50), unique=True, index=True, nullable=False)

    # Características da Vaga
    estrutura_fisica_id = Column("EstruturaFisicaId", Integer, ForeignKey("EstruturasFisicas.Id"), nullable=False)
    finalidade_id = Column("FinalidadeId", Integer, ForeignKey("FinalidadesEndereco.Id"), nullable=False)
    peso_maximo_kg = Column("PesoMaximoKg", Float, nullable=False)

    # Exclusivo para Picking Fixo (Se estiver vazio, é uma vaga dinâmica/pulmão)
    produto_id = Column("ProdutoId", Integer, ForeignKey("Produtos.Id"), nullable=True)
    capacidade_maxima_und = Column("CapacidadeMaximaUnd", Integer, nullable=True)

    # AUDITORIA E CONCORRÊNCIA (Padrão ACID)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamentos para facilitar as consultas no SQLAlchemy
    area = relationship("Area")
    estrutura = relationship("EstruturaFisica")
    finalidade = relationship("FinalidadeEndereco")
    produto = relationship("Produto")

    __mapper_args__ = {
        "version_id_col": rowversion
    }