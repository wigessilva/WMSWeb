from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Area(Base):
    __tablename__ = "areas"

    id = Column("Id", Integer, primary_key=True, index=True)
    letra = Column("Letra", String(5), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)

    # Vincula esta área a uma Filial/Matriz específica
    filial_id = Column("FilialId", Integer, ForeignKey("filiais.Id"), nullable=False)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamento 1 para N (Uma área tem vários endereços)
    enderecos = relationship("Endereco", back_populates="area", cascade="all, delete-orphan")
    filial_relacao = relationship("Filial", back_populates="areas")

    # Configuração para controlo de concorrência

    __mapper_args__ = {
        "version_id_col": rowversion
    }