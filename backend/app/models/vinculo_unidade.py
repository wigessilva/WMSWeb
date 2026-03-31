from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class VinculoUnidade(Base):
    __tablename__ = "VinculosUnidade"

    id = Column("Id", Integer, primary_key=True, index=True)

    # 1. A unidade que vem escrita no XML (Ex: ROL, CX, PCT)
    unidade_externa = Column("UnidadeExterna", String(20), nullable=False, index=True)

    # 2. A nossa unidade interna oficial (Aponta para a tabela de Unidades de Medida do WMS)
    unidade_medida_id = Column("UnidadeMedidaId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=False)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)

    # Relacionamento
    unidade_interna = relationship("UnidadeMedida")