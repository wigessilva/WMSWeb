from sqlalchemy import Table, Column, Integer, ForeignKey
from ..db.database import Base

# Tabela de associacao muitos-para-muitos entre Usuarios e Filiais
usuario_filial = Table(
    "UsuarioFilial",
    Base.metadata,
    Column("UsuarioId", Integer, ForeignKey("Usuarios.Id"), primary_key=True),
    Column("FilialId", Integer, ForeignKey("Filiais.Id"), primary_key=True)
)