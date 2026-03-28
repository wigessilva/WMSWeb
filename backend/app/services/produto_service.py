from sqlalchemy.orm import Session
from ..models.produto import Produto
from ..models.unidade_produto import UnidadeProduto
from ..schemas.produto import ProdutoEditar, ProdutoAtivar


class ProdutoService:
    @staticmethod
    def editar_produto(db: Session, produto_id: int, produto_dados: ProdutoEditar):
        db_produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not db_produto:
            return None

        # Pega apenas os campos que foram enviados na requisição para atualizar
        dados_atualizar = produto_dados.model_dump(exclude_unset=True)
        for chave, valor in dados_atualizar.items():
            setattr(db_produto, chave, valor)

        db.commit()
        db.refresh(db_produto)
        return db_produto

    @staticmethod
    def buscar_por_id(db: Session, produto_id: int):
        return db.query(Produto).filter(Produto.id == produto_id).first()

    @staticmethod
    def listar_todos(db: Session):
        return db.query(Produto).all()

    @staticmethod
    def ativar_produto(db: Session, produto_id: int, dados_ativacao: ProdutoAtivar):
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not produto:
            return None

        # 1. Atualiza os dados do Produto
        produto.familia_id = dados_ativacao.familia_id
        produto.herdar_regras_familia = dados_ativacao.herdar_regras_familia
        produto.status = "ativo"

        # 2. Limpa as unidades antigas (caso o usuário esteja reativando/editando)
        db.query(UnidadeProduto).filter(UnidadeProduto.produto_id == produto_id).delete()

        # 3. Insere as novas unidades
        for und in dados_ativacao.unidades:
            nova_und = UnidadeProduto(
                produto_id=produto.id,
                tipo=und.tipo,
                unidade_medida_id=und.unidade_medida_id,
                fator_conversao=und.fator_conversao,
                peso_bruto=und.peso_bruto,
                largura=und.largura,
                comprimento=und.comprimento,
                altura=und.altura
            )
            db.add(nova_und)

        # 4. Salva tudo em uma única transação (Garantia ACID)
        db.commit()
        db.refresh(produto)
        return produto