from sqlalchemy.orm import Session
from ..models.produto import Produto
from ..models.unidade_produto import UnidadeProduto
from ..schemas.produto import ProdutoEditar, ProdutoAtivar
from ..schemas.unidade_produto import UnidadeProdutoEditar


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

            # Validação automática de status:
            # Se não estiver inativo, verifica se possui família e ao menos uma unidade base
        if db_produto.status != "inativo":
            tem_unidade_base = any(u.tipo == 'base' for u in db_produto.unidades)
            if db_produto.familia_id and tem_unidade_base:
                db_produto.status = "ativo"
            else:
                db_produto.status = "pendente"

        db.commit()
        db.refresh(db_produto)
        return db_produto

    @staticmethod
    def buscar_por_id(db: Session, produto_id: int):
        return db.query(Produto).filter(Produto.id == produto_id).first()

    @staticmethod
    def listar_todos(db: Session, busca: str = None):
        query = db.query(Produto).with_hint(Produto, 'WITH (NOLOCK)')
        if busca:
            # Filtra por SKU ou Descrição que contenham o termo (case-insensitive)
            filtro = f"%{busca}%"
            query = query.filter(
                (Produto.sku.ilike(filtro)) | (Produto.descricao.ilike(filtro))
            )
        return query.all()

    @staticmethod
    def ativar_produto(db: Session, produto_id: int, dados_ativacao: ProdutoAtivar):
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not produto:
            return None

        # 1. Atualiza os dados do Produto
        produto.familia_id = dados_ativacao.familia_id
        produto.variavel_consumo = dados_ativacao.variavel_consumo
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
                largura_unidade_id=und.largura_unidade_id,
                comprimento=und.comprimento,
                comprimento_unidade_id=und.comprimento_unidade_id,
                altura=und.altura,
                altura_unidade_id=und.altura_unidade_id,
                ean=und.ean
            )
            db.add(nova_und)

        # 4. Salva tudo em uma única transação (Garantia ACID)
        db.commit()
        db.refresh(produto)
        return produto

    @staticmethod
    def alterar_status(db: Session, produto_id: int, novo_status: str):
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not produto:
            raise ValueError("Produto não encontrado.")

        if novo_status not in ["ativo", "inativo", "pendente"]:
            raise ValueError("Status deve ser: ativo, inativo ou pendente.")

        produto.status = novo_status
        db.commit()
        db.refresh(produto)
        return produto

    @staticmethod
    def alterar_bloqueio(db: Session, produto_id: int, dados_bloqueio):
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        if not produto:
            raise ValueError("Produto não encontrado.")

        produto.bloqueado = dados_bloqueio.bloqueado
        produto.motivo_bloqueio = dados_bloqueio.motivo_bloqueio

        db.commit()
        db.refresh(produto)
        return produto

    @staticmethod
    def editar_unidade(db: Session, unidade_id: int, dados: UnidadeProdutoEditar):
        unidade = db.query(UnidadeProduto).filter(UnidadeProduto.id == unidade_id).first()
        if not unidade:
            return None

        dados_atualizar = dados.model_dump(exclude_unset=True)
        for chave, valor in dados_atualizar.items():
            setattr(unidade, chave, valor)

            # Revalida o status do produto pai após alterar a unidade
        produto_pai = unidade.produto
        if produto_pai and produto_pai.status != "inativo":
            tem_unidade_base = any(u.tipo == 'base' for u in produto_pai.unidades)
            if produto_pai.familia_id and tem_unidade_base:
                produto_pai.status = "ativo"
            else:
                produto_pai.status = "pendente"

        db.commit()
        db.refresh(unidade)
        return unidade