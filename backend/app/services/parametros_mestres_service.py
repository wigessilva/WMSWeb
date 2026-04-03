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

        # Atualiza apenas os campos que foram enviados na requisição
        dados_atualizar = dados.model_dump(exclude_unset=True)
        for chave, valor in dados_atualizar.items():
            setattr(parametros, chave, valor)

        db.commit()
        db.refresh(parametros)
        return parametros