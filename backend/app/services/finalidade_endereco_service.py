from sqlalchemy.orm import Session
from ..models.finalidade_endereco import FinalidadeEndereco
from ..schemas.finalidade_endereco import FinalidadeEnderecoCriar

class FinalidadeEnderecoService:
    @staticmethod
    def criar(db: Session, dados: FinalidadeEnderecoCriar):
        # Regra de Negócio: Se marcar como Picking, não pode ser Pulmão
        if dados.tipo_picking and dados.tipo_pulmao:
            dados.tipo_pulmao = False

        db_obj = FinalidadeEndereco(
            nome=dados.nome,
            tipo_pulmao=dados.tipo_pulmao,
            tipo_picking=dados.tipo_picking,
            tipo_quarentena=dados.tipo_quarentena
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(FinalidadeEndereco).all()