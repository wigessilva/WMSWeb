import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Resolve o caminho exato: sobe de db -> app -> backend e procura o .env
CAMINHO_BASE = Path(__file__).resolve().parent.parent.parent
CAMINHO_ENV = CAMINHO_BASE / ".env"

# Verifica se o arquivo realmente existe antes de tentar carregar
if not CAMINHO_ENV.exists():
    raise FileNotFoundError(f"Arquivo .env não encontrado no caminho: {CAMINHO_ENV}")

load_dotenv(dotenv_path=CAMINHO_ENV)

# Construção da URL de conexão para o SQL Server (pyodbc)
DB_DRIVER = os.getenv("DB_DRIVER")
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")

# Credenciais do ERP
ERP_DB_NAME = os.getenv("ERP_DB_NAME")
ERP_DB_USER = os.getenv("ERP_DB_USER")
ERP_DB_PASS = os.getenv("ERP_DB_PASSWORD")

url_conexao = URL.create(
    "mssql+pyodbc",
    username=DB_USER,
    password=DB_PASS,
    host=DB_SERVER,
    database=DB_NAME,
    query={
        "driver": DB_DRIVER,
        "TrustServerCertificate": "yes"
    }
)

# URL de conexão somente leitura para o ERP (usando o mesmo DB_SERVER)
url_conexao_erp = URL.create(
    "mssql+pyodbc",
    username=ERP_DB_USER,
    password=ERP_DB_PASS,
    host=DB_SERVER,
    database=ERP_DB_NAME,
    query={
        "driver": DB_DRIVER,
        "TrustServerCertificate": "yes"
    }
)

engine = create_engine(url_conexao)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Novo motor exclusivo para o ERP
engine_erp = create_engine(url_conexao_erp)
SessionLocalERP = sessionmaker(autocommit=False, autoflush=False, bind=engine_erp)

Base = declarative_base()

# Função para obter a sessão do banco WMS
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# Função para obter a sessão do banco ERP
def get_erp_db():
    db = SessionLocalERP()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()