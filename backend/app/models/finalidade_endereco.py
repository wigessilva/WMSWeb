from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from ..db.database import Base

class FinalidadeEndereco(Base):
    __tablename__ = "FinalidadesEndereco"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(50), unique=True, index=True, nullable=False)

    # Flags Comportamentais (Tipificadores)
    tipo_pulmao = Column("TipoPulmao", Boolean, default=False, nullable=False)
    tipo_picking = Column("TipoPicking", Boolean, default=False, nullable=False)
    tipo_quarentena = Column("TipoQuarentena", Boolean, default=False, nullable=False)

    # AUDITORIA E CONCORRENCIA (Padrao ACID)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }