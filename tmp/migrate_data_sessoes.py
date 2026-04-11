from app.db.database import engine
from sqlalchemy import text

def migrate_data():
    with engine.connect() as conn:
        print("Migrating existing readings to initial sessions...")
        
        # 1. For each item that has readings, create a RecebimentoSessoes entry (NumeroSessao=1)
        res = conn.execute(text("""
            SELECT DISTINCT RecebimentoItemId FROM RecebimentoLeituras 
            WHERE SessaoId IS NULL
        """)).mappings().all()
        
        for row in res:
            item_id = row['RecebimentoItemId']
            # Get created_by from the first reading or default to 'Sistema'
            first_reading = conn.execute(text("SELECT TOP 1 Usuario FROM RecebimentoLeituras WHERE RecebimentoItemId = :id"), {"id": item_id}).first()
            user = first_reading[0] if first_reading else 'Sistema'
            
            # Create session
            print(f"Creating session 1 for item {item_id}...")
            conn.execute(text("""
                INSERT INTO RecebimentoSessoes (RecebimentoItemId, NumeroSessao, CriadoPor, Motivo)
                VALUES (:item_id, 1, :user, 'Migração Inicial')
            """), {"item_id": item_id, "user": user})
            
            # Get the session id
            sessao_id = conn.execute(text("SELECT SCOPE_IDENTITY()")).scalar()
            
            # Update readings
            conn.execute(text("""
                UPDATE RecebimentoLeituras SET SessaoId = :sessao_id 
                WHERE RecebimentoItemId = :item_id AND SessaoId IS NULL
            """), {"sessao_id": sessao_id, "item_id": item_id})
            
        conn.commit()
        print("Data migration completed.")

if __name__ == "__main__":
    migrate_data()
