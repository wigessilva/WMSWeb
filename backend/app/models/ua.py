from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base


class UA(Base):
    __tablename__ = "Uas"

    id = Column("Id", Integer, primary_key=True, index=True)

    # Ex: UA0124589 (2 letras + 7 números = 9 caracteres)
    ua = Column("UA", String(9), unique=True, index=True, nullable=False)

    # A qual filial esta etiqueta física pertence
    filial_id = Column("FilialId", Integer, ForeignKey("Filiais.Id"), nullable=False)

    # Se estiver em trânsito, para qual filial está a viajar?
    filial_destino_id = Column("FilialDestinoId", Integer, ForeignKey("Filiais.Id"), nullable=True)

    # Identificação do Produto (Opcional para UAs virgens)
    produto_id = Column("ProdutoId", Integer, ForeignKey("Produtos.Id"), nullable=True)

    # Rastreabilidade (vindos do Recebimento/ERP)
    lote = Column("Lote", String(50), nullable=True)
    data_validade = Column("DataValidade", DateTime, nullable=True)

    # Quantidade amarrada à Unidade específica daquele Produto
    quantidade = Column("Quantidade", Float, nullable=True) # Quantidade Operacional (Variável)
    quantidade_base = Column("QuantidadeBase", Float, nullable=True) # Quantidade Contábil (Base)
    unidade_produto_id = Column("UnidadeProdutoId", Integer, ForeignKey("UnidadesProduto.Id"), nullable=True)
    unidade_medida_operacional_id = Column("UnidadeMedidaOperacionalId", Integer, ForeignKey("UnidadesMedida.Id"), nullable=True)
    fator_conversao = Column("FatorConversao", Float, default=1.0, nullable=False)

    # Localização Física (Opcional, pois pode estar 'Em Trânsito' na empilhadora)
    endereco_id = Column("EnderecoId", Integer, ForeignKey("Enderecos.Id"), nullable=True)

    # Qualidade e Status de Ciclo de Vida
    estado = Column("Estado", String(10), default="Bom", nullable=False)
    status = Column("Status", String(50), default="Gerada", nullable=False)
    descricao_visual = Column("DescricaoVisual", String(255), nullable=True)
    observacoes = Column("Observacoes", String(255), nullable=True)

    # Auditoria Padrão ACID
    criado_em = Column("CriadoEm", DateTime, default=datetime.now)
    atualizado_em = Column("AtualizadoEm", DateTime, default=datetime.now, onupdate=datetime.now)
    criado_por = Column("CriadoPor", String(100), nullable=True)
    atualizado_por = Column("AtualizadoPor", String(100), nullable=True)
    rowversion = Column("Rowversion", Integer, default=1, nullable=False)

    # Relacionamentos para facilitar as consultas do SQLAlchemy
    # Precisamos especificar qual chave estrangeira (foreign_key) cada relação usa
    filial = relationship("Filial", foreign_keys=[filial_id])
    filial_destino = relationship("Filial", foreign_keys=[filial_destino_id])

    produto = relationship("Produto")
    unidade_produto = relationship("UnidadeProduto")
    unidade_medida_operacional = relationship("UnidadeMedida", foreign_keys=[unidade_medida_operacional_id])
    endereco = relationship("Endereco")

    __mapper_args__ = {
        "version_id_col": rowversion
    }