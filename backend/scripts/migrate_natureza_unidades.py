import sys
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar os módulos da app
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from app.db.database import SessionLocal
from app.models.unidade_medida import UnidadeMedida
from sqlalchemy import text

def migrar_natureza():
    db = SessionLocal()
    try:
        print("🔍 Iniciando migração da natureza das unidades de medida...")
        
        # Mapeamento
        updates = [
            ("Peso", "Massa"),
            ("Largura", "Linear"),
            ("Comprimento", "Linear")
        ]
        
        for de, para in updates:
            print(f"  -> Migrando '{de}' para '{para}'...")
            unidades = db.query(UnidadeMedida).filter(UnidadeMedida.natureza == de).all()
            for u in unidades:
                u.natureza = para
                print(f"     ✅ Unidade {u.sigla} atualizada.")
        
        db.commit()
        print("\n✨ Migração concluída com sucesso!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro durante a migração: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrar_natureza()
