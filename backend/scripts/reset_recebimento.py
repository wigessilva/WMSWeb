import os
import shutil
from pathlib import Path
import sys

# Adiciona o diretório backend ao path para importar a base
sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    from app.db.database import SessionLocal, engine
    from sqlalchemy import text
except ImportError as e:
    print(f"Erro ao importar dependências: {e}")
    sys.exit(1)

def reset_database():
    print("--- LIMPANDO BANCO DE DADOS ---")
    db = SessionLocal()
    try:
        # Desabilita constraints para facilitar o truncate/delete
        # No SQL Server usamos DELETE se não quisermos lidar com aninhamento complexo de FKs agora
        # Mas vamos tentar na ordem correta
        
        print("Limpando RecebimentoLeituras...")
        db.execute(text("DELETE FROM RecebimentoLeituras"))
        
        print("Limpando HistoricoUas...")
        db.execute(text("DELETE FROM HistoricoUas"))

        print("Limpando Uas...")
        db.execute(text("DELETE FROM Uas"))
        
        print("Limpando RecebimentoItens...")
        db.execute(text("DELETE FROM RecebimentoItens"))
        
        print("Limpando Recebimentos...")
        db.execute(text("DELETE FROM Recebimentos"))

        print("Limpando HistoricoXml...")
        db.execute(text("DELETE FROM HistoricoXml"))

        print("Limpando LogTransicoes...")
        db.execute(text("DELETE FROM LogTransicoes WHERE Tabela = 'Recebimentos'"))
        
        db.commit()
        print("Banco de dados resetado com sucesso.")
    except Exception as e:
        db.rollback()
        print(f"Erro ao resetar banco: {e}")
    finally:
        db.close()

def reset_files():
    print("\n--- MOVENDO ARQUIVOS XML ---")
    # Caminho base do projeto (WMSWeb)
    base_path = Path(__file__).resolve().parent.parent.parent
    xml_path = base_path / "XML"
    # Listar arquivos em Processados e Com_Erro
    pastas_origem = [xml_path / "Processados", xml_path / "Com_Erro"]
    
    for pasta in pastas_origem:
        if not pasta.exists():
            print(f"Pasta {pasta} não encontrada, pulando...")
            continue

        arquivos = list(pasta.glob("*.xml"))
        if not arquivos:
            print(f"Nenhum arquivo XML encontrado em {pasta.name}.")
            continue

        for arquivo in arquivos:
            try:
                destino = xml_path / arquivo.name
                shutil.move(str(arquivo), str(destino))
                print(f"Movido: {arquivo.name} ({pasta.name} -> {xml_path.name})")
            except Exception as e:
                print(f"Erro ao mover {arquivo.name}: {e}")

if __name__ == "__main__":
    reset_database()
    reset_files()
    print("\nReset concluído. O sistema está pronto para um novo teste.")
