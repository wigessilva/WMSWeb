from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from datetime import datetime
from ..db.database import Base


class ParametrosMestres(Base):
    __tablename__ = "ParametrosMestres"

    id = Column("Id", Integer, primary_key=True, index=True)

    # POLÍTICAS DE ESTOQUE
    # True = Obrigatória, False = Opcional
    validade_obrigatoria = Column("ValidadeObrigatoria", Boolean, default=False, nullable=False)
    lote_obrigatorio = Column("LoteObrigatorio", Boolean, default=False, nullable=False)

    # FEFO, FIFO ou LIFO
    modelo_giro = Column("ModeloGiro", String(10), default="FEFO", nullable=False)

    # BLOQUEIOS AUTOMÁTICOS
    # True = Bloqueia, False = Permite movimentação
    bloquear_vencido = Column("BloquearVencido", Boolean, default=True, nullable=False)
    bloquear_reprovado = Column("BloquearReprovado", Boolean, default=True, nullable=False)
    bloquear_sem_validade = Column("BloquearSemValidade", Boolean, default=False, nullable=False)
    bloquear_sem_lote = Column("BloquearSemLote", Boolean, default=False, nullable=False)

    # PARÂMETROS DE RECEBIMENTO
    tolerancia_financeira_tipo = Column("ToleranciaFinanceiraTipo", String(20), default="VALOR", nullable=False)  # VALOR ou PORCENTAGEM
    tolerancia_financeira_valor = Column("ToleranciaFinanceiraValor", Float, default=0.0, nullable=False)

    # AUDITORIA E CONCORRÊNCIA (Padrão ACID)
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": rowversion
    }