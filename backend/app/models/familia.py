from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..db.database import Base


class Familia(Base):
    __tablename__ = "Familias"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(100), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)

    # Define se a família obedece aos parâmetros mestres (True) ou tem a sua própria (False)
    herdar_parametros_mestres = Column("HerdarParametrosMestres", Boolean, default=True)

    variavel_consumo = Column("VariavelConsumo", String(20), default="unidade", nullable=False)

    # Regras específicas da família (usadas apenas se herdar_parametros_mestres for False)
    validade_obrigatoria = Column("ValidadeObrigatoria", Boolean, nullable=True)
    lote_obrigatorio = Column("LoteObrigatorio", Boolean, nullable=True)
    modelo_giro = Column("ModeloGiro", String(10), nullable=True)
    bloquear_vencido = Column("BloquearVencido", Boolean, nullable=True)
    bloquear_reprovado = Column("BloquearReprovado", Boolean, nullable=True)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }