from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.vinculo_fornecedor import VinculoProdutoFornecedor

class VinculoFornecedorService:
    def sugerir_sku_heuristica(self, db: Session, dados: dict):
        cnpj = dados.get("cnpj_fornecedor")
        preco = dados.get("preco_unitario_nota")
        quantidade = dados.get("quantidade_nota")
        unidade = dados.get("unidade_nota")
        xped = dados.get("xped")

        # 1. Chave de Ouro: Tenta pelo numero do pedido se o fornecedor enviou a tag xPed no XML
        if xped:
            query_pedido = text(
                "SELECT pci.Sku FROM PedidosCompraItens pci "
                "JOIN PedidosCompra pc ON pc.NumeroOC = pci.NumeroOC "
                "WHERE pc.NumeroOC = :xped AND pc.Fornecedor = :cnpj "
                "LIMIT 1"
            )
            resultado = db.execute(query_pedido, {"xped": xped, "cnpj": cnpj}).fetchone()
            if resultado:
                return self._buscar_id_interno_por_sku(db, resultado[0])

        # 2. Heuristica: Busca no ERP por Fornecedor (CNPJ), Preco, Qtd e cruza com as Unidades
        query_heuristica = text(
            "SELECT pci.Sku "
            "FROM PedidosCompraItens pci "
            "JOIN PedidosCompra pc ON pc.NumeroOC = pci.NumeroOC "
            "LEFT JOIN VinculosUnidade vu ON vu.SiglaInterna = pci.Und AND vu.CnpjFornecedor = pc.Fornecedor "
            "WHERE pc.Fornecedor = :cnpj "
            "AND pci.PrecoUnitario = :preco "
            "AND pci.Qtd = :quantidade "
            "AND (vu.UnidadeFornecedor = :unidade OR pci.Und = :unidade) "
            "LIMIT 2"
        )

        resultados = db.execute(query_heuristica, {
            "cnpj": cnpj,
            "preco": preco,
            "quantidade": quantidade,
            "unidade": unidade
        }).fetchall()

        # Se encontrou exatamente 1 correspondencia, temos a certeza e sugerimos o SKU
        if len(resultados) == 1:
            return self._buscar_id_interno_por_sku(db, resultados[0][0])

        # Em caso de empate (mais de 1 item igual) ou nenhum resultado, forca o utilizador a escolher
        return None

    def _buscar_id_interno_por_sku(self, db: Session, sku: str):
        from ..models.produto import Produto
        produto = db.query(Produto).filter(Produto.sku == sku).first()
        return produto.id if produto else None

    def salvar_vinculo(self, db: Session, produto_id: int, codigo_fornecedor: str, cnpj_fornecedor: str, usuario: str):
        existente = db.query(VinculoProdutoFornecedor).filter(
            VinculoProdutoFornecedor.codigo_fornecedor == codigo_fornecedor,
            VinculoProdutoFornecedor.cnpj_fornecedor == cnpj_fornecedor
        ).first()

        if existente:
            existente.produto_id = produto_id
            existente.criado_por = usuario
        else:
            novo_vinculo = VinculoProdutoFornecedor(
                produto_id=produto_id,
                codigo_fornecedor=codigo_fornecedor,
                cnpj_fornecedor=cnpj_fornecedor,
                criado_por=usuario
            )
            db.add(novo_vinculo)

        db.commit()
        return True

vinculo_fornecedor_service = VinculoFornecedorService()