from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Perfil(Base):
    __tablename__ = "Perfis"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(50), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)
    permite_liberar_sem_oc = Column("PermiteLiberarSemOC", Boolean, default=False, nullable=False)

    # Auditoria padrao
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamento 1 para N (Um perfil tem varios usuarios)
    usuarios = relationship("Usuario", back_populates="perfil_relacao")

    __mapper_args__ = {
        "version_id_col": rowversion
    }