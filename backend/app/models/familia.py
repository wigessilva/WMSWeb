from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..db.database import Base


class Familia(Base):
    __tablename__ = "Familias"

    id = Column("Id", Integer, primary_key=True, index=True)
    nome = Column("Nome", String(100), unique=True, index=True, nullable=False)
    descricao = Column("Descricao", String(255), nullable=True)

    variavel_consumo = Column("VariavelConsumo", String(20), default="unidade", nullable=False)

    # Regras específicas da família
    tipo_validade = Column("TipoValidade", String(20), nullable=True)
    prazo_validade = Column("PrazoValidade", Integer, nullable=True)
    vencimento_minimo = Column("VencimentoMinimo", Integer, nullable=True)
    area_armazenagem_preferencial = Column("AreaArmazenagemPreferencial", String(50), nullable=True)
    lote_obrigatorio = Column("LoteObrigatorio", Boolean, nullable=True)
    modelo_giro = Column("ModeloGiro", String(10), nullable=True)
    bloquear_vencido = Column("BloquearVencido", Boolean, nullable=True)
    bloquear_sem_validade = Column("BloquearSemValidade", Boolean, nullable=True)
    bloquear_sem_lote = Column("BloquearSemLote", Boolean, nullable=True)
    bloquear_reprovado = Column("BloquearReprovado", Boolean, nullable=True)
    fracionavel_recebimento = Column("FracionavelRecebimento", Boolean, default=True, nullable=True)

    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }