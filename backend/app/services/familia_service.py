from sqlalchemy.orm import Session
from ..models.familia import Familia
from ..schemas.familia import FamiliaCriar, FamiliaEditar


class FamiliaService:
    @staticmethod
    def criar(db: Session, dados: FamiliaCriar):
        db_obj = Familia(
            nome=dados.nome,
            descricao=dados.descricao,
            variavel_consumo=dados.variavel_consumo,
            tipo_validade=dados.tipo_validade,
            prazo_validade=dados.prazo_validade,
            vencimento_minimo=dados.vencimento_minimo,
            area_armazenagem_preferencial=dados.area_armazenagem_preferencial,
            lote_obrigatorio=dados.lote_obrigatorio,
            modelo_giro=dados.modelo_giro,
            bloquear_vencido=dados.bloquear_vencido,
            bloquear_sem_validade=dados.bloquear_sem_validade,
            bloquear_sem_lote=dados.bloquear_sem_lote,
            bloquear_reprovado=dados.bloquear_reprovado
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def listar_todas(db: Session):
        return db.query(Familia).all()

    @staticmethod
    def atualizar(db: Session, familia_id: int, dados: FamiliaEditar):
        db_obj = db.query(Familia).filter(Familia.id == familia_id).first()
        if not db_obj:
            return None

        dados_atualizar = dados.model_dump(exclude_unset=True)
        for chave, valor in dados_atualizar.items():
            setattr(db_obj, chave, valor)

        db.commit()
        db.refresh(db_obj)
        return db_obj