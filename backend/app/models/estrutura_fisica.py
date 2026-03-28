from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from ..db.database import Base

class EstruturaFisica(Base):
    __tablename__ = "estruturas_fisicas"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(50), unique=True, index=True, nullable=False)

    # Flags de Capacidade Física (Cumulativas)
    comporta_palete = Column("ComportaPalete", Boolean, default=False, nullable=False)
    comporta_caixa = Column("ComportaCaixa", Boolean, default=False, nullable=False)
    comporta_log = Column("ComportaLog", Boolean, default=False, nullable=False)

    # AUDITORIA E CONCORRENCIA (Padrao ACID)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }