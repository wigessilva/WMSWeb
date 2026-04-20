from sqlalchemy.orm import Session
from ..models.parametros_mestres import ParametrosMestres
from ..schemas.parametros_mestres import ParametrosMestresEditar


class ParametrosMestresService:
    @staticmethod
    def obter_parametros(db: Session):
        # Tenta buscar o primeiro (e único) parametro
        parametros = db.query(ParametrosMestres).first()

        # Se não existir nenhum no banco, cria a configuração padrão automaticamente
        if not parametros:
            parametros = ParametrosMestres()
            db.add(parametros)
            db.commit()
            db.refresh(parametros)

        return parametros

    @staticmethod
    def atualizar_parametros(db: Session, dados: ParametrosMestresEditar):
        parametros = ParametrosMestresService.obter_parametros(db)

        # Verifica se houve alteração em campos que afetam a validação de preços
        revalidar = False
        if dados.tolerancia_financeira_tipo is not None or dados.tolerancia_financeira_valor is not None:
            revalidar = True

        # Se solicitou resetar as exceções, removemos as configurações customizadas de Produtos e Famílias
        if dados.resetar_excecoes:
            from ..models.produto import Produto
            from ..models.familia import Familia
            
            campos_reset = {
                "tipo_validade": None,
                "lote_obrigatorio": None,
                "modelo_giro": None,
                "bloquear_vencido": None,
                "bloquear_reprovado": None,
                "bloquear_sem_validade": None,
                "bloquear_sem_lote": None
            }
            
            db.query(Produto).update(campos_reset)
            db.query(Familia).update(campos_reset)
            db.flush()

        # Atualiza apenas os campos que foram enviados na requisição
        dados_atualizar = dados.model_dump(exclude_unset=True)
        # Remove resetar_excecoes pois não é um campo da tabela ParametrosMestres
        dados_atualizar.pop("resetar_excecoes", None)
        
        for chave, valor in dados_atualizar.items():
            setattr(parametros, chave, valor)

        db.commit()
        db.refresh(parametros)

        if revalidar:
            from .recebimento_service import RecebimentoService
            RecebimentoService.revalidar_precos_pendentes(db)

        return parametros