from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..db.database import Base


class UnidadeMedida(Base):
    __tablename__ = "UnidadesMedida"

    # O primeiro parâmetro (ex: "Id", "Sigla") força o nome da coluna no banco em PascalCase
    id = Column("Id", Integer, primary_key=True, index=True)
    sigla = Column("Sigla", String(10), unique=True, index=True, nullable=False)
    desc = Column("Desc", String(100), nullable=False)

    # Se False (não), o sistema bloqueará entradas fracionadas (ex: 1.5) no futuro
    decimais = Column("Decimais", Boolean, default=False, nullable=False)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }