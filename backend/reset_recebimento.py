import os
import shutil
from pathlib import Path
from sqlalchemy import create_engine, text
from app.db.database import url_conexao

# Configurações de Caminhos
# d:/PyCharm/Projects/WMSWeb/backend/script.py
BASE_DIR = Path("d:/PyCharm/Projects/WMSWeb")
XML_DIR = BASE_DIR / "XML"
PROCESSADOS_DIR = XML_DIR / "Processados"

def reset_database():
    print("Conectando ao banco de dados...")
    engine = create_engine(url_conexao)
    with engine.connect() as conn:
        print("Limpando tabelas de recebimento...")
        # A ordem respeita as chaves estrangeiras
        conn.execute(text("DELETE FROM RecebimentoLeituras"))
        conn.execute(text("DELETE FROM RecebimentoItens"))
        conn.execute(text("DELETE FROM Recebimentos"))
        conn.execute(text("DELETE FROM HistoricoUas"))
        conn.execute(text("DELETE FROM UAs"))
        conn.execute(text("DELETE FROM HistoricoXML"))
        conn.execute(text("DELETE FROM LogTransicoes"))
        conn.commit()
    print("Banco de dados limpo com sucesso!")

def reset_files():
    print(f"Verificando pasta de processados: {PROCESSADOS_DIR}")
    if not PROCESSADOS_DIR.exists():
        print("Pasta Processados não encontrada.")
        return

    files = list(PROCESSADOS_DIR.glob("*.xml"))
    print(f"Encontrados {len(files)} arquivos para mover.")

    for f in files:
        dest = XML_DIR / f.name
        print(f"Movendo {f.name} para {XML_DIR}")
        shutil.move(str(f), str(dest))
    
    print("Arquivos movidos com sucesso!")

if __name__ == "__main__":
    try:
        reset_database()
        reset_files()
        print("\nReset concluído com sucesso!")
    except Exception as e:
        print(f"\nERRO AO REALIZAR RESET: {e}")
