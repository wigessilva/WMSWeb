from fastapi import FastAPI
from app.db.database import engine, Base
from app.api.v1.endpoints import produto_router, unidade_medida_router, regra_global_router, familia_router

# Importa os modelos para que o SQLAlchemy crie as relações corretamente
from app.models.familia import Familia
from app.models.produto import Produto
from app.models.unidade_produto import UnidadeProduto
from app.models.unidade_medida import UnidadeMedida
from app.models.regra_global import RegraGlobal
from app.services.scheduler_service import iniciar_scheduler

# Cria as tabelas no SQL Server na inicialização
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WMS Web - Sistema de Gestão de Armazém")

# Incluindo as rotas
app.include_router(produto_router.router, prefix="/produtos", tags=["Produtos"])
app.include_router(unidade_medida_router.router, prefix="/unidades-medida", tags=["Unidades de Medida"])
app.include_router(regra_global_router.router, prefix="/regras-globais", tags=["Regras Globais"])
app.include_router(familia_router.router, prefix="/familias", tags=["Famílias"])

# Inicia as tarefas de segundo plano assim que o servidor ligar
@app.on_event("startup")
def iniciar_rotinas_em_segundo_plano():
    iniciar_scheduler()

@app.get("/")
def raiz():
    return {"mensagem": "WMS Online e operante!"}