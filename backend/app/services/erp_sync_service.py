from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.produto import Produto
from app.models.unidade_medida import UnidadeMedida
from app.models.unidade_produto import UnidadeProduto


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

    @staticmethod
    def sincronizar_produtos_unidades(db_wms: Session, db_erp: Session):
        # Ordenamos por Codigo e Fator ASC para garantir que a unidade base (fator 1.0) seja lida primeiro
        query_erp = text("SELECT Codigo, Sigla, Fator FROM ProdutosUnidades ORDER BY Codigo, Fator ASC")
        resultados_erp = db_erp.execute(query_erp).fetchall()

        unidades_adicionadas = 0
        unidades_atualizadas = 0

        # Rastreia quais produtos já tiveram sua unidade base (a primeira) processada
        produtos_processados = set()

        for linha in resultados_erp:
            codigo_erp = str(linha.Codigo)
            sigla_erp = str(linha.Sigla).upper()
            fator_erp = float(linha.Fator)

            produto = db_wms.query(Produto).filter(Produto.sku == codigo_erp).first()
            if not produto:
                continue

            unidade_medida = db_wms.query(UnidadeMedida).filter(UnidadeMedida.sigla == sigla_erp).first()
            if not unidade_medida:
                continue

            # A primeira unidade na ordem do ERP é a base
            if codigo_erp not in produtos_processados:
                tipo_unidade = "base"
                fator_erp = 1.0  # Força o fator 1.0
                produtos_processados.add(codigo_erp)
            else:
                tipo_unidade = "produto"

            unidade_produto = db_wms.query(UnidadeProduto).filter(
                UnidadeProduto.produto_id == produto.id,
                UnidadeProduto.unidade_medida_id == unidade_medida.id
            ).first()

            if not unidade_produto:
                nova_unidade_produto = UnidadeProduto(
                    produto_id=produto.id,
                    tipo=tipo_unidade,
                    unidade_medida_id=unidade_medida.id,
                    fator_conversao=fator_erp
                )
                db_wms.add(nova_unidade_produto)
                unidades_adicionadas += 1
            else:
                atualizou = False
                if unidade_produto.fator_conversao != fator_erp:
                    unidade_produto.fator_conversao = fator_erp
                    atualizou = True

                # Se for a primeira unidade do ERP, garante que o tipo no WMS seja 'base'
                if tipo_unidade == "base" and unidade_produto.tipo != "base":
                    unidade_produto.tipo = "base"
                    atualizou = True

                if atualizou:
                    unidades_atualizadas += 1

        db_wms.commit()

        return {
            "adicionadas": unidades_adicionadas,
            "atualizadas": unidades_atualizadas
        }

    @staticmethod
    def sincronizar_unidades_medida(db_wms: Session, db_erp: Session):
        query_erp = text("SELECT Sigla, Descricao FROM UnidadesMedida")

        # Lendo os dados do ERP
        resultados_erp = db_erp.execute(query_erp).fetchall()

        unidades_adicionadas = 0
        unidades_atualizadas = 0

        for linha in resultados_erp:
            sigla_erp = str(linha.Sigla).upper()
            desc_erp = str(linha.Descricao)

            # Verifica se a unidade já existe no WMS
            unidade_existente = db_wms.query(UnidadeMedida).filter(UnidadeMedida.sigla == sigla_erp).first()

            if not unidade_existente:
                # A unidade não existe no WMS, cria com decimais = False por padrão
                nova_unidade = UnidadeMedida(
                    sigla=sigla_erp,
                    desc=desc_erp,
                    decimais=False
                )
                db_wms.add(nova_unidade)
                unidades_adicionadas += 1
            else:
                # Se já existe, atualiza apenas a descrição.
                # NUNCA atualiza os decimais aqui, pois o WMS agora é o dono dessa informação.
                if unidade_existente.desc != desc_erp:
                    unidade_existente.desc = desc_erp
                    unidades_atualizadas += 1

        # Salva as alterações no WMS
        db_wms.commit()

        return {
            "inseridas": unidades_adicionadas,
            "atualizadas": unidades_atualizadas
        }