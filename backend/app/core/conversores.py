from sqlalchemy.orm import Session
from ..models.produto import Produto
from ..models.unidade_medida import UnidadeMedida
from ..models.unidade_produto import UnidadeProduto

class ConversorDimensional:
    @staticmethod
    def converter_para_operacional(db: Session, produto_id: int, valor_base: float):
        """
        Converte um valor da unidade base para a variável de consumo operacional.
        Retorna: (valor_convertido, unidade_medida_id)
        """
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not produto:
            return valor_base, None
            
        # Lógica de Herança da Variável de Consumo
        variavel = (produto.variavel_consumo or (produto.familia_relacao.variavel_consumo if produto.familia_relacao else 'unidade')).lower()
        
        if variavel == 'unidade':
            return valor_base, produto.unidade_medida_id

        # 1. Determina a natureza alvo e a sigla operacional primeiro
        natureza_alvo = "Linear" # Padrão para Comprimento e Largura
        if variavel == 'peso':
            natureza_alvo = "Peso"

        unidade_operacional = db.query(UnidadeMedida).filter(
            UnidadeMedida.natureza == natureza_alvo,
            UnidadeMedida.fator_conversao == 1.0
        ).first()

        id_resultado = produto.unidade_medida_id
        if unidade_operacional:
            id_resultado = unidade_operacional.id

        # 2. Busca estritamente a unidade do tipo 'produto' para as dimensões
        unidade_referencia = db.query(UnidadeProduto).filter(
            UnidadeProduto.produto_id == produto_id,
            UnidadeProduto.tipo == 'produto'
        ).first()

        if not unidade_referencia:
            # Sem unidade do tipo produto, não há como garantir a conversão correta
            return None, id_resultado

        try:
            if variavel == 'comprimento':
                if not unidade_referencia.largura or not unidade_referencia.largura_unidade_id:
                    print(f"Conversor: Largura ausente para produto {produto.sku}")
                    return None, id_resultado
                
                um_largura = db.query(UnidadeMedida).filter(UnidadeMedida.id == unidade_referencia.largura_unidade_id).first()
                fator_largura = um_largura.fator_conversao if um_largura else 1.0
                largura_padrao = unidade_referencia.largura * fator_largura
                
                if largura_padrao == 0:
                    return None, id_resultado
                
                return round(valor_base / largura_padrao, 4), id_resultado

            elif variavel == 'largura':
                if not unidade_referencia.comprimento or not unidade_referencia.comprimento_unidade_id:
                    print(f"Conversor: Comprimento ausente para produto {produto.sku}")
                    return None, id_resultado
                
                um_comp = db.query(UnidadeMedida).filter(UnidadeMedida.id == unidade_referencia.comprimento_unidade_id).first()
                fator_comp = um_comp.fator_conversao if um_comp else 1.0
                comp_padrao = unidade_referencia.comprimento * fator_comp
                
                if comp_padrao == 0:
                    return None, id_resultado
                
                return round(valor_base / comp_padrao, 4), id_resultado
            
        except Exception as e:
            print(f"Erro na conversão dimensional: {e}")
            return None, id_resultado

        return None, id_resultado
