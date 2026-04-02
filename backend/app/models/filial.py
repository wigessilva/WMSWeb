from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base
from .usuario_filial import usuario_filial

class Filial(Base):
    __tablename__ = "Filiais"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(100), nullable=False)
    cnpj = Column("Cnpj", String(20), index=True, nullable=True)
    url_api = Column("UrlApi", String(255), nullable=True)  # Ex: http://192.168.1.50:8006
    is_matriz = Column("IsMatriz", Boolean, default=False, nullable=False)
    ativo = Column("Ativo", Boolean, default=False, nullable=False)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Uma filial possui várias áreas (Pulmão, Recebimento, etc.)
    areas = relationship("Area", back_populates="filial_relacao")

    # Relacionamento com usuarios
    usuarios = relationship("Usuario", secondary=usuario_filial, back_populates="filiais")

    __mapper_args__ = {
        "version_id_col": rowversion
    }