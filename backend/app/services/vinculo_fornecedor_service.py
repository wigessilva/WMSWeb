from sqlalchemy.orm import Session
from ..models.vinculo_fornecedor import VinculoProdutoFornecedor
from ..models.produto import Produto
from ..models.recebimento import Recebimento, RecebimentoItem
from ..models.historico_xml import HistoricoXML
from ..enums import StatusRecebimento, StatusRecebimentoItem
from ..services.recebimento_service import RecebimentoService

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
            
        cnpj = vinculo.cnpj_fornecedor
        codigo_forn = vinculo.codigo_fornecedor
        
        db.delete(vinculo)
        db.flush()

        # Encontrar todas as NFes do fornecedor com esse CNPJ
        historicos = db.query(HistoricoXML.nfe).filter(HistoricoXML.cnpj_emitente == cnpj).all()
        nfes_forn = [h[0] for h in historicos]

        if nfes_forn:
            # Buscar recebimentos dessas NFes que estão em estados anteriores à conferência
            recebimentos = db.query(Recebimento).filter(
                Recebimento.nfe.in_(nfes_forn),
                Recebimento.status.in_([
                    StatusRecebimento.IMPORTADO.value, 
                    StatusRecebimento.BLOQUEADO.value, 
                    StatusRecebimento.AGUARDANDO_LIBERACAO.value
                ])
            ).all()

            for rec in recebimentos:
                itens_afetados = db.query(RecebimentoItem).filter(
                    RecebimentoItem.recebimento_id == rec.id,
                    RecebimentoItem.codigo_fornecedor == codigo_forn,
                    RecebimentoItem.sku.isnot(None)
                ).all()
                
                teve_alteracao = False
                for item in itens_afetados:
                    item.sku = None
                    item.status = StatusRecebimentoItem.PENDENTE_VINCULO.value
                    teve_alteracao = True
                
                if teve_alteracao:
                    # Se afetou o recebimento, atualizamos o status pai (se for AGUARDANDO_LIBERACAO, ele volta pra IMPORTADO no atualizar_status_pai)
                    RecebimentoService.atualizar_status_pai(db, rec.id)

        db.commit()
        return {"sucesso": True}
