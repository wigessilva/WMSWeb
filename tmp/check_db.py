from app.db.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("Checking tables...")
        res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"))
        for row in res:
            print(f"- {row[0]}")
        
        print("\nChecking RecebimentoLeituras columns...")
        res = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RecebimentoLeituras'"))
        for row in res:
            print(f"- {row[0]}")

if __name__ == "__main__":
    check()
