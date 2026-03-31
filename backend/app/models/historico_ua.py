from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class HistoricoUA(Base):
    __tablename__ = "HistoricoUas"

    id = Column("Id", Integer, primary_key=True, index=True)

    # A qual UA este evento pertence
    ua_id = Column("UaId", Integer, ForeignKey("Uas.Id"), nullable=False)

    # O que aconteceu (Ex: CRIACAO, TRANSFERENCIA, MUDANCA_ESTADO, EXPEDICAO)
    tipo_acao = Column("TipoAcao", String(50), nullable=False)

    # De onde saiu (Pode ser nulo na criação)
    origem_endereco_id = Column("OrigemEnderecoId", Integer, ForeignKey("Enderecos.Id"), nullable=True)

    # Para onde foi (Pode ser nulo na expedição)
    destino_endereco_id = Column("DestinoEnderecoId", Integer, ForeignKey("Enderecos.Id"), nullable=True)

    # Justificativas ou detalhes do evento
    observacoes = Column("Observacoes", String(255), nullable=True)

    # Auditoria Padrão ACID (Sem usuário obrigatório por enquanto)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamentos
    ua = relationship("UA")
    origem = relationship("Endereco", foreign_keys=[origem_endereco_id])
    destino = relationship("Endereco", foreign_keys=[destino_endereco_id])

    __mapper_args__ = {
        "version_id_col": rowversion
    }