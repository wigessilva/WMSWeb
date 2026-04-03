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
            herdar_parametros_mestres=dados.herdar_parametros_mestres,
            validade_obrigatoria=dados.validade_obrigatoria,
            lote_obrigatorio=dados.lote_obrigatorio,
            modelo_giro=dados.modelo_giro,
            bloquear_vencido=dados.bloquear_vencido,
            bloquear_reprovado=dados.bloquear_reprovado
        )

        # Regra de negócio: Se herda parâmetros mestres, anula qualquer regra local enviada
        if db_obj.herdar_parametros_mestres:
            db_obj.validade_obrigatoria = None
            db_obj.lote_obrigatorio = None
            db_obj.modelo_giro = None
            db_obj.bloquear_vencido = None
            db_obj.bloquear_reprovado = None

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

        # limpa as regras locais para garantir a integridade do banco
        if db_obj.herdar_parametros_mestres:
            db_obj.validade_obrigatoria = None
            db_obj.lote_obrigatorio = None
            db_obj.modelo_giro = None
            db_obj.bloquear_vencido = None
            db_obj.bloquear_reprovado = None

        db.commit()
        db.refresh(db_obj)
        return db_obj