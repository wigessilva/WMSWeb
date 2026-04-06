from sqlalchemy.orm import Session
from ..models.vinculo_fornecedor import VinculoProdutoFornecedor
from ..models.produto import Produto

class VinculoFornecedorService:
    @staticmethod
    def listar_vinculos(db: Session, termo: str = None):
        query = db.query(
            VinculoProdutoFornecedor.id,
            VinculoProdutoFornecedor.codigo_fornecedor.label("codigoFornecedor"),
            VinculoProdutoFornecedor.cnpj_fornecedor.label("cnpjFornecedor"),
            VinculoProdutoFornecedor.criado_por.label("criadoPor"),
            Produto.sku,
            Produto.descricao
        ).join(Produto, VinculoProdutoFornecedor.produto_id == Produto.id)

        if termo:
            query = query.filter(
                (Produto.sku.ilike(f"%{termo}%")) |
                (Produto.descricao.ilike(f"%{termo}%")) |
                (VinculoProdutoFornecedor.codigo_fornecedor.ilike(f"%{termo}%")) |
                (VinculoProdutoFornecedor.cnpj_fornecedor.ilike(f"%{termo}%"))
            )

        vinculos = query.all()
        return [
            {
                "id": v.id,
                "sku": v.sku,
                "descricao": v.descricao,
                "codigoFornecedor": v.codigoFornecedor,
                "cnpjFornecedor": v.cnpjFornecedor,
                "criadoPor": v.criadoPor
            }
            for v in vinculos
        ]

    @staticmethod
    def excluir_vinculo(db: Session, vinculo_id: int):
        vinculo = db.query(VinculoProdutoFornecedor).filter(VinculoProdutoFornecedor.id == vinculo_id).first()
        if not vinculo:
            raise ValueError("Vínculo não encontrado.")
        db.delete(vinculo)
        db.commit()
        return {"sucesso": True}
