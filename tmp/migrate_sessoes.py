from app.db.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Creating RecebimentoSessoes table...")
        conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RecebimentoSessoes')
            BEGIN
                CREATE TABLE RecebimentoSessoes (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    RecebimentoItemId INT NOT NULL,
                    NumeroSessao INT NOT NULL DEFAULT 1,
                    CriadoEm DATETIME NOT NULL DEFAULT GETDATE(),
                    CriadoPor NVARCHAR(100) NOT NULL,
                    Motivo NVARCHAR(255) NULL,
                    CONSTRAINT FK_RecebimentoSessoes_RecebimentoItens FOREIGN KEY (RecebimentoItemId) REFERENCES RecebimentoItens(Id)
                )
            END
        """))
        
        print("Checking if SessaoId column exists in RecebimentoLeituras...")
        res = conn.execute(text("SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('RecebimentoLeituras') AND name = 'SessaoId'")).first()
        if not res:
            print("Adding SessaoId to RecebimentoLeituras...")
            conn.execute(text("ALTER TABLE RecebimentoLeituras ADD SessaoId INT NULL"))
            print("Adding FK constraint for SessaoId...")
            conn.execute(text("ALTER TABLE RecebimentoLeituras ADD CONSTRAINT FK_RecebimentoLeituras_RecebimentoSessoes FOREIGN KEY (SessaoId) REFERENCES RecebimentoSessoes(Id)"))
        else:
            print("SessaoId already exists.")
            
        conn.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
