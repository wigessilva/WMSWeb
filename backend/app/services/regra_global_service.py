from sqlalchemy.orm import Session
from ..models.regra_global import RegraGlobal
from ..schemas.regra_global import RegraGlobalEditar


class RegraGlobalService:
    @staticmethod
    def obter_regras(db: Session):
        # Tenta buscar a primeira (e única) regra
        regras = db.query(RegraGlobal).first()

        # Se não existir nenhuma no banco, cria a configuração padrão automaticamente
        if not regras:
            regras = RegraGlobal()
            db.add(regras)
            db.commit()
            db.refresh(regras)

        return regras

    @staticmethod
    def atualizar_regras(db: Session, dados: RegraGlobalEditar):
        regras = RegraGlobalService.obter_regras(db)

        # Atualiza apenas os campos que foram enviados na requisição
        dados_atualizar = dados.model_dump(exclude_unset=True)
        for chave, valor in dados_atualizar.items():
            setattr(regras, chave, valor)

        db.commit()
        db.refresh(regras)
        return regras