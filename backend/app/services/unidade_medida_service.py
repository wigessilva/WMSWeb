from sqlalchemy.orm import Session
from ..models.unidade_medida import UnidadeMedida
from ..schemas.unidade_medida import UnidadeMedidaCriar

class UnidadeMedidaService:
    @staticmethod
    def criar(db: Session, dados: UnidadeMedidaCriar):
        # Transforma o Schema num Model para o banco
        db_obj = UnidadeMedida(
            sigla=dados.sigla.upper(), # Força a sigla a ficar sempre em maiúsculas
            desc=dados.desc,
            decimais=dados.decimais
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(UnidadeMedida).all()