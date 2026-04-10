import os
import sys
from pathlib import Path
from sqlalchemy import text, create_engine

# Adiciona o diretório atual ao sys.path para importar app
sys.path.append(str(Path.cwd()))

from app.db.database import engine

def fix_db():
    print("Verificando colunas na tabela RecebimentoItens...")
    with engine.connect() as conn:
        # Verifica se a coluna Tentativas existe
        try:
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'RecebimentoItens' AND COLUMN_NAME = 'Tentativas'
            """)).first()
            
            if not result:
                print("Coluna 'Tentativas' não encontrada. Adicionando...")
                conn.execute(text("ALTER TABLE RecebimentoItens ADD Tentativas INT DEFAULT 0 NOT NULL"))
                conn.commit()
                print("Coluna 'Tentativas' adicionada com sucesso.")
            else:
                print("Coluna 'Tentativas' já existe.")
        except Exception as e:
            print(f"Erro ao verificar/adicionar coluna: {e}")

if __name__ == "__main__":
    fix_db()
