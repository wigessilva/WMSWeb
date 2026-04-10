
import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao sys.path para importar app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.db.database import engine
from sqlalchemy import text

def fix_uas_data():
    with engine.connect() as conn:
        print("Buscando UAs corrompidas (com produto mas sem unidade ou quantidade)...")
        
        # Encontra UAs que vão falhar na validação
        query_find = text("""
            SELECT Id, UA, ProdutoId, Quantidade, UnidadeProdutoId 
            FROM Uas 
            WHERE ProdutoId IS NOT NULL 
            AND (Quantidade IS NULL OR UnidadeProdutoId IS NULL)
        """)
        
        uas_corrompidas = conn.execute(query_find).fetchall()
        
        if not uas_corrompidas:
            print("Nenhuma UA corrompida encontrada.")
            return

        print(f"Encontradas {len(uas_corrompidas)} UAs corrompidas. Corrigindo...")
        
        for row in uas_corrompidas:
            ua_id = row[0]
            prod_id = row[2]
            
            # Tenta encontrar a unidade base do produto para corrigir
            query_unit = text("SELECT TOP 1 Id FROM UnidadesProduto WHERE ProdutoId = :prod_id ORDER BY Id")
            unit_id = conn.execute(query_unit, {"prod_id": prod_id}).scalar()
            
            if unit_id:
                print(f"Corrigindo UA {row[1]} (id: {ua_id}) com unidade {unit_id} e qtd 0...")
                update_query = text("""
                    UPDATE Uas 
                    SET UnidadeProdutoId = :unit_id, Quantidade = COALESCE(Quantidade, 0)
                    WHERE Id = :ua_id
                """)
                conn.execute(update_query, {"unit_id": unit_id, "ua_id": ua_id})
            else:
                print(f"Não foi possível encontrar uma unidade para o produto {prod_id}. Removendo produto da UA {row[1]}...")
                # Se não tem unidade nenhuma, melhor virar UA virgem de novo
                update_query = text("""
                    UPDATE Uas 
                    SET ProdutoId = NULL, UnidadeProdutoId = NULL, Quantidade = NULL, Lote = NULL, DataValidade = NULL
                    WHERE Id = :ua_id
                """)
                conn.execute(update_query, {"ua_id": ua_id})
        
        conn.commit()
        print("Correção concluída!")

if __name__ == "__main__":
    try:
        fix_uas_data()
    except Exception as e:
        print(f"Erro ao corrigir dados: {e}")
        sys.exit(1)
