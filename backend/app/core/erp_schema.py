class ERPSchema:
    """
    Centraliza o mapeamento de tabelas e colunas do Banco de Dados do ERP.
    Edite este arquivo para adequar o sistema a diferentes nomes e estruturas de ERP.
    """
    
    # --- TABELAS ---
    TABELA_PEDIDOS_COMPRA = "PedidosCompra"
    TABELA_PEDIDOS_COMPRA_ITENS = "PedidosCompraItens"
    TABELA_PRODUTOS = "Produtos"
    TABELA_PRODUTOS_UNIDADES = "ProdutosUnidades"
    TABELA_UNIDADES_MEDIDA = "UnidadesMedida"

    # --- COLUNAS: PedidosCompra (Cabeçalho) ---
    COL_OC_NUMERO = "NumeroOC"

    # --- COLUNAS: PedidosCompraItens (Detalhes da OC) ---
    COL_IT_OC_NUMERO = "NumeroOC"
    COL_IT_SKU = "Sku"
    COL_IT_PRECO = "PrecoUnitario"
    COL_IT_UND = "Und"
    COL_IT_QTD = "Qtd"
    COL_IT_QTD_RECEBIDA = "QtdRecebida"
    COL_IT_DESCRICAO = "Descricao"

    # --- COLUNAS: Produtos (Cadastro de Peças) ---
    COL_PROD_SKU = "Cod"
    COL_PROD_DESCRICAO = "Descricao"
    COL_PROD_REF = "Ref"

    # --- COLUNAS: ProdutosUnidades (Fatores de Conversão) ---
    COL_PU_ID = "Id"
    COL_PU_SKU = "Codigo"
    COL_PU_SIGLA = "Sigla"
    COL_PU_FATOR = "Fator"

    # --- COLUNAS: UnidadesMedida (Cadastro Global) ---
    COL_UM_SIGLA = "Sigla"
    COL_UM_DESCRICAO = "Descricao"
