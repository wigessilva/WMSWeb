from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from ..db.database import Base

# Tabela de associação (Muitos-para-Muitos)
perfil_permissao = Table(
    "PerfilPermissoes",
    Base.metadata,
    Column("PerfilId", Integer, ForeignKey("Perfis.Id"), primary_key=True),
    Column("PermissaoId", Integer, ForeignKey("Permissoes.Id"), primary_key=True)
)

class Permissao(Base):
    __tablename__ = "Permissoes"

    id = Column("Id", Integer, primary_key=True, index=True)
    chave = Column("Chave", String(100), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)

    # Relacionamento M:N com Perfis
    perfis = relationship("Perfil", secondary=perfil_permissao, back_populates="permissoes")
