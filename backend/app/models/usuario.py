from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base
from .usuario_filial import usuario_filial


class Usuario(Base):
    __tablename__ = "Usuarios"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(100), nullable=False)
    login = Column("Login", String(50), unique=True, index=True, nullable=False)
    senha_hash = Column("SenhaHash", String(255), nullable=False)

    # Chave estrangeira ligando a tabela de Perfis
    perfil_id = Column("PerfilId", Integer, ForeignKey("Perfis.Id"), nullable=False)

    ultimo_login = Column("UltimoLogin", DateTime, nullable=True)
    ativo = Column("Ativo", Boolean, default=True, nullable=False)
    token_sessao = Column("TokenSessao", String(255), nullable=True)

    # Auditoria padrao
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamento
    perfil_relacao = relationship("Perfil", back_populates="usuarios")

    # Relacionamento com filiais
    filiais = relationship("Filial", secondary=usuario_filial, back_populates="usuarios")

    __mapper_args__ = {
        "version_id_col": rowversion
    }