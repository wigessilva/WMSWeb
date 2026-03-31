from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class VinculoProdutoFornecedor(Base):
    __tablename__ = "VinculosProdutoFornecedor"

    id = Column("Id", Integer, primary_key=True, index=True)

    # 1. SKU Interno (Aponta para o nosso cadastro de produtos)
    produto_id = Column("ProdutoId", Integer, ForeignKey("Produtos.Id"), nullable=False)

    # 2. Descrição Interna (Acedida automaticamente através do relacionamento abaixo)

    # 3. Cód. do Fornecedor (Como vem no XML)
    codigo_fornecedor = Column("CodigoFornecedor", String(100), nullable=False, index=True)

    # 4. CNPJ do Fornecedor (Para garantir que o código 123 da Sony não se mistura com o 123 da Samsung)
    cnpj_fornecedor = Column("CnpjFornecedor", String(20), nullable=False, index=True)

    # Auditoria
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)

    # Relacionamento com o Produto
    produto = relationship("Produto")