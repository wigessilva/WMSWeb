from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.produto import Produto


class ServicoSincronizacaoERP:
    @staticmethod
    def sincronizar_produtos(db_wms: Session, db_erp: Session):
        # Substitua 'NOME_DA_TABELA_NO_ERP' pelo nome real da tabela de produtos no seu ERP
        query_erp = text("SELECT Cod, Descricao, Ref FROM Produtos")

        # Lendo os dados do ERP
        resultados_erp = db_erp.execute(query_erp).fetchall()

        produtos_adicionados = 0
        produtos_atualizados = 0

        for linha in resultados_erp:
            sku_erp = str(linha.Cod)
            descricao_erp = str(linha.Descricao)
            referencia_erp = str(linha.Ref) if linha.Ref else None

            # Verifica se o produto já existe no WMS
            produto_existente = db_wms.query(Produto).filter(Produto.sku == sku_erp).first()

            if not produto_existente:
                # O produto não existe no WMS, então vamos criá-lo com status pendente
                novo_produto = Produto(
                    sku=sku_erp,
                    descricao=descricao_erp,
                    referencia=referencia_erp,
                    status="pendente"
                )
                db_wms.add(novo_produto)
                produtos_adicionados += 1
            else:
                # Se já existe, garantimos que a descrição e referência continuem iguais às do ERP
                if produto_existente.descricao != descricao_erp or produto_existente.referencia != referencia_erp:
                    produto_existente.descricao = descricao_erp
                    produto_existente.referencia = referencia_erp
                    produtos_atualizados += 1

        # Salva as alterações no WMS
        db_wms.commit()

        return {
            "mensagem": "Sincronização concluída com sucesso.",
            "adicionados": produtos_adicionados,
            "atualizados": produtos_atualizados
        }