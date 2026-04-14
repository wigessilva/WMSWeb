import os
import pyodbc
from dotenv import load_dotenv

# Carrega as variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

def get_db_connection():
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    server = os.getenv("DB_SERVER", "localhost")
    database = os.getenv("DB_NAME", "WMSWEB")
    user = os.getenv("DB_USER", "sa")
    password = os.getenv("DB_PASSWORD", "SuaSenhaForte123!")

    conn_str = f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};UID={user};PWD={password}"
    return pyodbc.connect(conn_str)

def add_columns():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Adiciona na tabela Produtos
        try:
            print("Adicionando FracionavelRecebimento na tabela Produtos...")
            cursor.execute("ALTER TABLE Produtos ADD FracionavelRecebimento BIT DEFAULT 1 WITH VALUES;")
            conn.commit()
            print("Sucesso!")
        except Exception as e:
            print(f"Aviso/Erro Produtos: {e}")

        # Adiciona na tabela Familias
        try:
            print("Adicionando FracionavelRecebimento na tabela Familias...")
            cursor.execute("ALTER TABLE Familias ADD FracionavelRecebimento BIT DEFAULT 1 WITH VALUES;")
            conn.commit()
            print("Sucesso!")
        except Exception as e:
            print(f"Aviso/Erro Familias: {e}")

        cursor.close()
        conn.close()
        print("Tabelas atualizadas com sucesso!")
    except Exception as e:
        print(f"Erro de conexão com o banco: {e}")

if __name__ == "__main__":
    add_columns()
