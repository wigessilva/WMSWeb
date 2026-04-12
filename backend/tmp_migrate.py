from app.db.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Adding CFOP column...")
        try:
            conn.execute(text("ALTER TABLE RecebimentoItens ADD CFOP NVARCHAR(10) NULL"))
            conn.commit()
            print("CFOP added.")
        except Exception as e:
            print(f"CFOP might already exist: {e}")

        print("Adding IsBonificacao column...")
        try:
            conn.execute(text("ALTER TABLE RecebimentoItens ADD IsBonificacao BIT DEFAULT 0"))
            conn.commit()
            print("IsBonificacao added.")
        except Exception as e:
            print(f"IsBonificacao might already exist: {e}")

if __name__ == "__main__":
    migrate()
