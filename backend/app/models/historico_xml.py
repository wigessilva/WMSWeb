from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.db.database import Base

class HistoricoXML(Base):
    __tablename__ = "historico_xml"

    id = Column(Integer, primary_key=True, index=True)
    nfe = Column(String(50), nullable=False, unique=True)
    xped_original = Column(String(50), nullable=True)
    conteudo_xml = Column(Text, nullable=True)
    importado_em = Column(DateTime, default=datetime.now)