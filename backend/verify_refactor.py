from sqlalchemy import text
from app.db.database import engine

def main():
    with engine.connect() as conn:
        try:
            # 1. Check Perfis
            res = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Perfis' AND COLUMN_NAME = 'PermiteLiberarSemOC'"))
            if res.fetchone():
                print("ERRO: Coluna PermiteLiberarSemOC ainda existe em Perfis!")
            else:
                print("OK: Coluna PermiteLiberarSemOC removida de Perfis.")
            
            # 2. Check Permissoes
            res = conn.execute(text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Permissoes'"))
            if res.fetchone()[0] == 1:
                print("OK: Tabela Permissoes existe.")
                res = conn.execute(text("SELECT Chave FROM Permissoes"))
                print(f"Permissões: {[row[0] for row in res]}")
            else:
                print("ERRO: Tabela Permissoes NÃO existe!")
            
            # 3. Check PerfilPermissoes
            res = conn.execute(text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PerfilPermissoes'"))
            if res.fetchone()[0] == 1:
                print("OK: Tabela PerfilPermissoes existe.")
            else:
                print("ERRO: Tabela PerfilPermissoes NÃO existe!")

            # 4. Check Recebimentos
            res = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Recebimentos' AND COLUMN_NAME IN ('AutorizadoPor', 'AutorizadoEm')"))
            has_cols = [row[0] for row in res]
            print(f"Colunas extras em Recebimentos: {has_cols}")

        except Exception as e:
            print(f"Erro: {e}")

if __name__ == "__main__":
    main()
