import random
from sqlalchemy.orm import Session
from ..models.ua import UA
from ..schemas.ua import UACriar

# Importamos o modelo do histórico para o serviço poder usá-lo
from ..models.historico_ua import HistoricoUA


class UAService:
    @staticmethod
    def _gerar_codigo_unico(db: Session, codigos_temporarios: set = None) -> str:
        if codigos_temporarios is None:
            codigos_temporarios = set()

        while True:
            numero = f"{random.randint(0, 9999999):07d}"
            codigo = f"UA{numero}"

            if codigo in codigos_temporarios:
                continue

            existe = db.query(UA).filter(UA.codigo == codigo).first()
            if not existe:
                return codigo

    @staticmethod
    def criar(db: Session, dados: UACriar):
        novo_codigo = UAService._gerar_codigo_unico(db)

        db_obj = UA(
            codigo=novo_codigo,
            produto_id=dados.produto_id,
            lote=dados.lote,
            data_validade=dados.data_validade,
            quantidade=dados.quantidade,
            unidade_produto_id=dados.unidade_produto_id,
            endereco_id=dados.endereco_id,
            largura=dados.largura,
            comprimento=dados.comprimento,
            altura=dados.altura,
            estado=dados.estado,
            observacoes=dados.observacoes,
            status="Gerada"
        )

        db.add(db_obj)
        # O flush() envia para o banco e pega o ID, mas não fecha a transação!
        db.flush()

        # ---------------------------------------------------------
        # GRAVAÇÃO AUTOMÁTICA DO KARDEX (HISTÓRICO)
        # ---------------------------------------------------------
        historico = HistoricoUA(
            ua_id=db_obj.id,  # Agora já temos o ID graças ao flush()
            tipo_acao="CRIACAO",
            origem_endereco_id=None,  # Como acabou de nascer, não tem origem
            destino_endereco_id=db_obj.endereco_id,  # Se nasceu já num endereço, regista
            observacoes="Criação unitária de UA"
        )
        db.add(historico)

        # Agora sim, confirmamos a UA e o Histórico juntos de uma só vez
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def criar_em_lote(db: Session, dados: UACriar, quantidade: int):
        novas_uas = []
        codigos_gerados = set()

        # 1. Gera todas as UAs na memória
        for _ in range(quantidade):
            novo_codigo = UAService._gerar_codigo_unico(db, codigos_gerados)
            codigos_gerados.add(novo_codigo)

            db_obj = UA(
                codigo=novo_codigo,
                produto_id=dados.produto_id,
                lote=dados.lote,
                data_validade=dados.data_validade,
                quantidade=dados.quantidade,
                unidade_produto_id=dados.unidade_produto_id,
                endereco_id=dados.endereco_id,
                largura=dados.largura,
                comprimento=dados.comprimento,
                altura=dados.altura,
                estado=dados.estado,
                observacoes=dados.observacoes,
                status="Gerada"
            )
            novas_uas.append(db_obj)

        # 2. Envia todas as UAs para o banco de uma vez para obter os IDs (Alta Performance)
        db.add_all(novas_uas)
        db.flush()

        # 3. Gera o histórico para cada uma das UAs recém-criadas
        historicos = []
        for ua in novas_uas:
            hist = HistoricoUA(
                ua_id=ua.id,
                tipo_acao="CRIACAO",
                origem_endereco_id=None,
                destino_endereco_id=ua.endereco_id,
                observacoes=f"Criação em lote ({quantidade} UAs geradas simultaneamente)"
            )
            historicos.append(hist)

        # 4. Grava os históricos e fecha a transação global
        db.add_all(historicos)
        db.commit()

        # Atualiza a memória do Python com os dados finais do banco
        for ua in novas_uas:
            db.refresh(ua)

        return novas_uas

    @staticmethod
    def listar_todas(db: Session):
        return db.query(UA).all()