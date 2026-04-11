import sys
from pathlib import Path
from sqlalchemy import text

backend_dir = Path("d:/PyCharm/Projects/WMSWeb/backend")
sys.path.append(str(backend_dir))

from app.db.database import engine

def verify_columns():
    with engine.connect() as conn:
        query = text("""
            SELECT name 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID('dbo.RecebimentoLeituras')
        """)
        result = conn.execute(query)
        columns = [row[0] for row in result]
        print("Colunas atuais em RecebimentoLeituras:")
        for col in columns:
            print(f"- {col}")

if __name__ == "__main__":
    verify_columns()
