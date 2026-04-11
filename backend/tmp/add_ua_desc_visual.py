
import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao sys.path para importar app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.db.database import engine
from sqlalchemy import text

def add_descricao_visual_column():
    table_name = "Uas"
    column_name = "DescricaoVisual"
    column_type = "VARCHAR(255)"
    
    with engine.connect() as conn:
        print(f"Verificando se a coluna {column_name} já existe na tabela {table_name}...")
        
        # Check if column exists (SQL Server specific)
        check_query = text(f"""
            SELECT COUNT(*) 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID('{table_name}') 
            AND name = '{column_name}'
        """)
        
        exists = conn.execute(check_query).scalar()
        
        if exists > 0:
            print(f"A coluna {column_name} já existe.")
            return

        print(f"Adicionando a coluna {column_name}...")
        try:
            add_query = text(f"ALTER TABLE {table_name} ADD {column_name} {column_type} NULL")
            conn.execute(add_query)
            conn.commit()
            print("Coluna adicionada com sucesso!")
        except Exception as e:
            print(f"Erro ao adicionar coluna: {e}")
            raise e

if __name__ == "__main__":
    try:
        add_descricao_visual_column()
    except Exception as e:
        sys.exit(1)
