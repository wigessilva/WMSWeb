from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from ..db.database import Base

class Area(Base):
    __tablename__ = "areas"

    id = Column("Id", Integer, primary_key=True, index=True)
    letra = Column("Letra", String(5), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(100), nullable=False)

    # AUDITORIA E CONCORRENCIA (Padrao ACID)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }