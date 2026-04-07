from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from ..db.database import Base

class LogTransicao(Base):
    __tablename__ = "LogTransicoes"

    id = Column("Id", Integer, primary_key=True, index=True)

    # Referência genérica (qualquer tabela do sistema)
    tabela = Column("Tabela", String(100), nullable=False, index=True)       # Ex: "Recebimentos", "Perfis"
    registro_id = Column("RegistroId", Integer, nullable=False, index=True)  # Ex: 1027

    # O que aconteceu
    acao = Column("Acao", String(100), nullable=False)            # Ex: "Autorização", "Mudança de Status"
    gatilho = Column("Gatilho", String(50), nullable=False)       # Ex: "MANUAL", "SISTEMA", "SCHEDULER"
    estado_anterior = Column("EstadoAnterior", String(100), nullable=True)
    estado_novo = Column("EstadoNovo", String(100), nullable=True)

    # Quem e quando
    usuario = Column("Usuario", String(100), nullable=False, default="Sistema")
    data = Column("Data", DateTime, default=datetime.now, nullable=False)
    observacao = Column("Observacao", Text, nullable=True)
