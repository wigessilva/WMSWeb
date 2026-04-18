import random
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from ..models.ua import UA
from ..models.produto import Produto
from ..models.unidade_produto import UnidadeProduto
from ..schemas.ua import UACriar, UASchema, UAExpedirTransferencia, UAReceberTransferencia
from ..core.conversores import ConversorDimensional

# Importamos os modelos extras para validações e histórico
from ..models.historico_ua import HistoricoUA
from ..models.endereco import Endereco
from ..models.solicitacao_transferencia import SolicitacaoTransferencia


class UAService:
    @staticmethod
    def _gerar_codigo_unico(db: Session) -> str:
        # Busca o próximo valor da SEQUENCE no SQL Server
        proximo_id = db.execute(text("SELECT NEXT VALUE FOR UA_Sequence")).scalar()
        
        # Formata como UA0000001 (UA + 7 dígitos com zeros à esquerda)
        return f"UA{proximo_id:07d}"

    @staticmethod
    def criar(db: Session, dados: UACriar):
        novo_ua = UAService._gerar_codigo_unico(db)

        db_obj = UA(
            ua=novo_ua,
            filial_id=dados.filial_id,
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
            novo_ua = UAService._gerar_codigo_unico(db)

            db_obj = UA(
                ua=novo_ua,
                filial_id=dados.filial_id,
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
    def buscar_por_codigo(db: Session, ua_codigo: str):
        ua = db.query(UA).filter(
            UA.ua == ua_codigo,
            UA.status != 'ESTORNADA'
        ).options(
            joinedload(UA.produto).joinedload(Produto.unidade_medida_relacao),
            joinedload(UA.produto).joinedload(Produto.familia_relacao),
            joinedload(UA.unidade_medida_operacional),
            joinedload(UA.unidade_produto).joinedload(UnidadeProduto.unidade_medida_relacao)
        ).first()
        if not ua:
            return None
        
        # Mapeia manualmente para injetar SKU e Descrição se houver produto
        schema = UASchema.from_orm(ua)
        if ua.produto:
            schema.sku = ua.produto.sku
            schema.descricao = ua.produto.descricao
            
            # Prioriza a sigla da unidade_produto vinculada à UA, fallback para a unidade_medida do produto
            if ua.unidade_produto and ua.unidade_produto.unidade_medida_relacao:
                schema.unidade_base_sigla = ua.unidade_produto.unidade_medida_relacao.sigla
            else:
                schema.unidade_base_sigla = ua.produto.unidade_medida_relacao.sigla if ua.produto.unidade_medida_relacao else None
            
            # Resolução de Sigla e Quantidade Operacional
            valor_base = ua.quantidade_base if ua.quantidade_base is not None else ua.quantidade
            
            # Se já temos o ID da unidade operacional gravado, usamos ele (Performance)
            if ua.unidade_medida_operacional:
                schema.quantidade = ua.quantidade
                schema.unidade_sigla = ua.unidade_medida_operacional.sigla
            else:
                # Fallback para UAs antigas que não possuem o ID gravado
                qtd_op, id_um_op = ConversorDimensional.converter_para_operacional(db, ua.produto_id, valor_base)
                schema.quantidade = qtd_op
                if id_um_op:
                    from ..models.unidade_medida import UnidadeMedida
                    um_op = db.query(UnidadeMedida).filter(UnidadeMedida.id == id_um_op).first()
                    schema.unidade_sigla = um_op.sigla if um_op else None
            
        return schema

    @staticmethod
    def listar_todas(db: Session):
        uas = db.query(UA).filter(UA.status != 'ESTORNADA').options(
            joinedload(UA.produto).joinedload(Produto.unidade_medida_relacao),
            joinedload(UA.produto).joinedload(Produto.familia_relacao),
            joinedload(UA.unidade_medida_operacional),
            joinedload(UA.unidade_produto).joinedload(UnidadeProduto.unidade_medida_relacao)
        ).all()
        # Mapeia manualmente para injetar SKU e Descrição do Produto no topo do Schema
        resultado = []
        for ua in uas:
            schema = UASchema.from_orm(ua)
            if ua.produto:
                schema.sku = ua.produto.sku
                schema.descricao = ua.produto.descricao
                
                # Resolução de Sigla da Base
                if ua.unidade_produto and ua.unidade_produto.unidade_medida_relacao:
                    schema.unidade_base_sigla = ua.unidade_produto.unidade_medida_relacao.sigla
                else:
                    schema.unidade_base_sigla = ua.produto.unidade_medida_relacao.sigla if ua.produto.unidade_medida_relacao else None
                
                # Resolução de Sigla e Quantidade Operacional
                valor_base = ua.quantidade_base if ua.quantidade_base is not None else ua.quantidade
                
                # Se já temos o ID da unidade operacional gravado, usamos ele (Performance)
                if ua.unidade_medida_operacional:
                    schema.quantidade = ua.quantidade
                    schema.unidade_sigla = ua.unidade_medida_operacional.sigla
                else:
                    # Fallback para UAs antigas
                    qtd_op, id_um_op = ConversorDimensional.converter_para_operacional(db, ua.produto_id, valor_base)
                    schema.quantidade = qtd_op
                    if id_um_op:
                        from ..models.unidade_medida import UnidadeMedida
                        um_op = db.query(UnidadeMedida).filter(UnidadeMedida.id == id_um_op).first()
                        schema.unidade_sigla = um_op.sigla if um_op else None
                
            resultado.append(schema)
        return resultado

    @staticmethod
    def expedir_transferencia(db: Session, ua_codigo: str, dados: UAExpedirTransferencia):
        ua = db.query(UA).filter(UA.ua == ua_codigo).first()
        if not ua:
            raise ValueError("UA não encontrada.")

        if ua.status == "Em Trânsito":
            raise ValueError("A UA já está em trânsito.")

        origem_endereco_id = ua.endereco_id

        # 1. Tira a UA da prateleira e coloca no camião
        ua.endereco_id = None
        ua.filial_destino_id = dados.filial_destino_id
        ua.status = "Em Trânsito"

        # NOVO: 1.5. Cérebro de Atendimento da Solicitação
        if dados.solicitacao_id:
            solicitacao = db.query(SolicitacaoTransferencia).filter(
                SolicitacaoTransferencia.id == dados.solicitacao_id).first()
            if not solicitacao:
                raise ValueError("A solicitação informada não existe.")

            # Validações de cruzamento de dados para evitar erros operacionais
            if solicitacao.produto_id != ua.produto_id:
                raise ValueError(
                    f"Erro: O produto da UA (ID {ua.produto_id}) é diferente do produto pedido (ID {solicitacao.produto_id}).")

            if solicitacao.filial_requisitante_id != dados.filial_destino_id:
                raise ValueError("Erro: O destino da UA não bate com a filial que pediu o material.")

            if not ua.quantidade or ua.quantidade <= 0:
                raise ValueError("Erro: Esta UA não tem quantidade válida para abater no pedido.")

            # Abate o saldo do pedido
            solicitacao.quantidade_atendida += ua.quantidade

            # Automação de Status do Pedido
            if solicitacao.quantidade_atendida >= solicitacao.quantidade_solicitada:
                solicitacao.status = "finalizada"
            elif solicitacao.status == "pendente":
                solicitacao.status = "em_atendimento"

        # 2. Grava no Kardex
        historico = HistoricoUA(
            ua_id=ua.id,
            tipo_acao="EXPEDICAO_TRANSFERENCIA",
            origem_endereco_id=origem_endereco_id,
            destino_endereco_id=None,
            observacoes=dados.observacoes or f"Expedida para a filial destino ID: {dados.filial_destino_id}"
        )
        db.add(historico)
        db.commit()
        db.refresh(ua)
        return ua

    @staticmethod
    def receber_transferencia(db: Session, ua_codigo: str, nova_filial_id: int, dados: UAReceberTransferencia):
        ua = db.query(UA).filter(UA.ua == ua_codigo).first()
        if not ua:
            raise ValueError("UA não encontrada.")

        if ua.status != "Em Trânsito":
            raise ValueError("A UA não está em trânsito e não pode ser recebida.")

        if ua.filial_destino_id != nova_filial_id:
            raise ValueError("Alerta de Segurança: Esta UA não foi destinada a esta filial.")

            # 1. Descarrega a UA do camião, troca a posse e deixa na doca (fica sem endereço)
        ua.filial_id = nova_filial_id
        ua.filial_destino_id = None
        ua.endereco_id = None
        ua.status = "Recebida"

        # 2. Grava no Kardex
        historico = HistoricoUA(
            ua_id=ua.id,
            tipo_acao="RECEBIMENTO_TRANSFERENCIA",
            origem_endereco_id=None,
            destino_endereco_id=None,
            observacoes=dados.observacoes or f"Recebida na doca pela filial ID: {nova_filial_id}"
        )
        db.add(historico)
        db.commit()
        db.refresh(ua)
        return ua