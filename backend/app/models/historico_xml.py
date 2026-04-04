from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.database import Base

class HistoricoXML(Base):
    __tablename__ = "HistoricoXml"

    id = Column("Id", Integer, primary_key=True, index=True)
    nfe = Column("NFe", String(50), nullable=False, unique=True)
    chave_acesso = Column("ChaveAcesso", String(50), nullable=True)
    cnpj_emitente = Column("CnpjEmitente", String(20), nullable=True)
    data_emissao = Column("DataEmissao", DateTime, nullable=True)
    xped_original = Column("XPedOriginal", String(50), nullable=True)
    importado_em = Column("ImportadoEm", DateTime, default=datetime.now)