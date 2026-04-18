import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar os módulos da app
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from sqlalchemy import text
from app.db.database import engine

def add_column():
    with engine.connect() as conn:
        print("Checking if column UnidadeMedidaOperacionalId exists in Uas...")
        
        # Query to check if the column exists (SQL Server)
        check_query = text("""
            SELECT 1 FROM sys.columns 
            WHERE Name = 'UnidadeMedidaOperacionalId' 
            AND Object_ID = Object_ID('Uas')
        """)
        
        result = conn.execute(check_query).first()
        
        if not result:
            print("Column not found. Adding it...")
            try:
                # Add column
                conn.execute(text("ALTER TABLE Uas ADD UnidadeMedidaOperacionalId INT;"))
                print("Column added.")
                
                # Add foreign key
                print("Adding Foreign Key constraint...")
                conn.execute(text("""
                    ALTER TABLE Uas 
                    ADD CONSTRAINT FK_Uas_UnidadeMedidaOperacional 
                    FOREIGN KEY (UnidadeMedidaOperacionalId) 
                    REFERENCES UnidadesMedida(Id);
                """))
                print("Foreign Key constraint added.")
                
                conn.commit()
                print("Transaction committed successfully.")
            except Exception as e:
                print(f"Error while updating schema: {e}")
                conn.rollback()
        else:
            print("Column already exists.")

if __name__ == "__main__":
    add_column()
