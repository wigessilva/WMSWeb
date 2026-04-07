from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Perfil(Base):
    __tablename__ = "Perfis"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(50), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)

    # Relacionamento M:N com Permissoes (usa string lazy para evitar import circular)
    permissoes = relationship("Permissao", secondary="PerfilPermissoes", back_populates="perfis")

    # Auditoria padrao
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamento 1 para N (Um perfil tem varios usuarios)
    usuarios = relationship("Usuario", back_populates="perfil_relacao")

    __mapper_args__ = {
        "version_id_col": rowversion
    }