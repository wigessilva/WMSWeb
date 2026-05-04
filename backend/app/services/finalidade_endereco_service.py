from sqlalchemy.orm import Session
from fastapi import HTTPException
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

    @staticmethod
    def excluir(db: Session, finalidade_id: int):
        finalidade = db.query(FinalidadeEndereco).filter(FinalidadeEndereco.id == finalidade_id).first()
        if not finalidade:
            raise HTTPException(status_code=404, detail="Finalidade não encontrada.")
        from ..models.endereco import Endereco
        count = db.query(Endereco).filter(Endereco.finalidade_id == finalidade_id).count()
        if count > 0:
            raise HTTPException(status_code=409, detail=f"Não é possível excluir. Existem {count} endereço(s) usando esta finalidade.")
        db.delete(finalidade)
        db.commit()