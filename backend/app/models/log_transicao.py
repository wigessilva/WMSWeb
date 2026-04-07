from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class LogTransicao(Base):
    __tablename__ = "LogTransicoes"

    id = Column("Id", Integer, primary_key=True, index=True)
    recebimento_id = Column("RecebimentoId", Integer, ForeignKey("Recebimentos.Id"), nullable=False)
    
    estado_anterior = Column("EstadoAnterior", String(50), nullable=True)
    estado_novo = Column("EstadoNovo", String(50), nullable=False)
    acao = Column("Acao", String(100), nullable=False)  # Ex: "Autorização de Liberação", "Mudança de Status"
    
    usuario = Column("Usuario", String(100), nullable=False)
    data = Column("Data", DateTime, default=datetime.now, nullable=False)
    observacao = Column("Observacao", Text, nullable=True)

    # Relacionamento
    recebimento = relationship("Recebimento", backref="logs_transicoes")
