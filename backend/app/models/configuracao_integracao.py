from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..db.database import Base


class ConfiguracaoIntegracao(Base):
    __tablename__ = "configuracoes_integracao"

    id = Column("Id", Integer, primary_key=True, index=True)

    # Ex: "ROBO_NFE", "ERP_SYNC"
    nome_servico = Column("NomeServico", String(50), unique=True, nullable=False)

    # O caminho da pasta raiz que o usuário vai digitar na interface
    caminho_diretorio = Column("CaminhoDiretorio", String(255), nullable=True)

    # Permite ao usuário pausar o robô sem precisar desligar o servidor
    ativo = Column("Ativo", Boolean, default=True, nullable=False)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)