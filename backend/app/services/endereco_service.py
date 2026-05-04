from sqlalchemy.orm import Session, joinedload
from ..models.endereco import Endereco
from ..models.area import Area
from ..schemas.endereco import EnderecoLoteCriar, EnderecoDetalhadoSchema, EnderecoAtualizar


class EnderecoService:

    @staticmethod
    def listar_todos(db: Session):
        """Lista todos os endereços com os dados expandidos das tabelas relacionadas."""
        enderecos = (
            db.query(Endereco)
            .options(
                joinedload(Endereco.area),
                joinedload(Endereco.estrutura),
                joinedload(Endereco.finalidade),
                joinedload(Endereco.produto)
            )
            .order_by(Endereco.codigo_formatado)
            .all()
        )

        resultado = []
        for e in enderecos:
            resultado.append(EnderecoDetalhadoSchema(
                id=e.id,
                area_id=e.area_id,
                rua=e.rua,
                predio=e.predio,
                nivel=e.nivel,
                posicao=e.posicao,
                codigo_formatado=e.codigo_formatado,
                estrutura_fisica_id=e.estrutura_fisica_id,
                finalidade_id=e.finalidade_id,
                peso_maximo_kg=e.peso_maximo_kg,
                produto_id=e.produto_id,
                capacidade_maxima_und=e.capacidade_maxima_und,
                ativo=e.ativo,
                bloqueado=e.bloqueado,
                motivo_bloqueio=e.motivo_bloqueio,
                criado_em=e.criado_em,
                atualizado_em=e.atualizado_em,
                rowversion=e.rowversion,
                area_letra=e.area.letra if e.area else None,
                estrutura_nome=e.estrutura.nome if e.estrutura else None,
                finalidade_nome=e.finalidade.nome if e.finalidade else None,
                produto_descricao=e.produto.descricao if e.produto else None,
            ))

        return resultado

    @staticmethod
    def buscar_por_id(db: Session, endereco_id: int):
        return db.query(Endereco).filter(Endereco.id == endereco_id).first()

    @staticmethod
    def atualizar(db: Session, endereco_id: int, dados: EnderecoAtualizar):
        endereco = db.query(Endereco).filter(Endereco.id == endereco_id).first()
        if not endereco:
            raise ValueError("Endereço não encontrado.")

        # Atualiza apenas os campos que foram enviados
        if dados.estrutura_fisica_id is not None:
            endereco.estrutura_fisica_id = dados.estrutura_fisica_id
        if dados.finalidade_id is not None:
            endereco.finalidade_id = dados.finalidade_id
        if dados.peso_maximo_kg is not None:
            endereco.peso_maximo_kg = dados.peso_maximo_kg
        # produto_id e capacidade podem ser explicitamente None (remover vínculo)
        endereco.produto_id = dados.produto_id
        endereco.capacidade_maxima_und = dados.capacidade_maxima_und
        # Ciclo de vida
        if dados.ativo is not None:
            endereco.ativo = dados.ativo
        if dados.bloqueado is not None:
            endereco.bloqueado = dados.bloqueado
            endereco.motivo_bloqueio = dados.motivo_bloqueio if dados.bloqueado else None

        db.commit()
        db.refresh(endereco)
        return endereco

    @staticmethod
    def excluir(db: Session, endereco_id: int):
        endereco = db.query(Endereco).filter(Endereco.id == endereco_id).first()
        if not endereco:
            raise ValueError("Endereço não encontrado.")
        db.delete(endereco)
        db.commit()

    @staticmethod
    def gerar_em_lote(db: Session, dados: EnderecoLoteCriar):
        # 1. Busca a área para obter a letra e compor o código formatado
        area = db.query(Area).filter(Area.id == dados.area_id).first()
        if not area:
            raise ValueError("Área não encontrada.")

        novos_enderecos = []

        # 2. Ciclos encadeados para gerar todas as combinações matemáticas
        for r in range(dados.rua_inicio, dados.rua_fim + 1):
            for p in range(dados.predio_inicio, dados.predio_fim + 1):
                for n in range(dados.nivel_inicio, dados.nivel_fim + 1):
                    for pos in range(dados.posicao_inicio, dados.posicao_fim + 1):
                        # Formata o código com zeros à esquerda: Letra-Rua-Predio-Nivel-Posicao (ex: A-01-12-03-05)
                        codigo = f"{area.letra}-{r:02d}-{p:02d}-{n:02d}-{pos:02d}"

                        endereco = Endereco(
                            area_id=dados.area_id,
                            rua=r,
                            predio=p,
                            nivel=n,
                            posicao=pos,
                            codigo_formatado=codigo,
                            estrutura_fisica_id=dados.estrutura_fisica_id,
                            finalidade_id=dados.finalidade_id,
                            peso_maximo_kg=dados.peso_maximo_kg,
                            produto_id=dados.produto_id,
                            capacidade_maxima_und=dados.capacidade_maxima_und,
                            ativo=dados.ativo,
                            bloqueado=dados.bloqueado,
                            motivo_bloqueio=dados.motivo_bloqueio if dados.bloqueado else None
                        )
                        novos_enderecos.append(endereco)

        # 3. Inserção massiva na base de dados (Garante a performance e o princípio ACID)
        db.add_all(novos_enderecos)
        db.commit()

        return len(novos_enderecos)