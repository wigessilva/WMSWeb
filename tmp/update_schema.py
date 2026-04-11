import sys
from pathlib import Path
from sqlalchemy import text

# Adiciona o diretório backend ao path para importar a base
backend_dir = Path("d:/PyCharm/Projects/WMSWeb/backend")
sys.path.append(str(backend_dir))

try:
    from app.db.database import engine
    print("Conexão com o banco configurada.")
except ImportError as e:
    print(f"Erro ao importar engine: {e}")
    sys.exit(1)

def update_schema():
    print("--- ATUALIZANDO ESQUEMA DO BANCO DE DADOS ---")
    with engine.connect() as conn:
        # Coluna que faltou
        colunas = [
            ("UnidadeProdutoId", "INT NULL")
        ]
        
        for nome, tipo in colunas:
            print(f"Tentando adicionar coluna {nome}...")
            try:
                # Direct alter table since we know it's missing
                # Use brackets for SQL Server column name
                query = text(f"ALTER TABLE dbo.RecebimentoLeituras ADD [{nome}] {tipo}")
                conn.execute(query)
                conn.commit()
                print(f"Sucesso: {nome}")
            except Exception as e:
                print(f"Erro ao adicionar {nome}: {e}")

if __name__ == "__main__":
    update_schema()
    print("--- Atualização finalizada ---")
