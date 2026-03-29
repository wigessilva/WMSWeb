import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import engine, Base
from app.services.xml_watcher_service import iniciar_robo_vigia
from app.api.v1.endpoints import (
    produto_router,
    unidade_medida_router,
    regra_global_router,
    familia_router,
    endereco_router,
    area_router,
    estrutura_fisica_router,
    finalidade_endereco_router,
    ua_router,
    filial_router,
    solicitacao_transferencia_router,
    recebimento_router
)

# Importa os modelos para que o SQLAlchemy crie as relações corretamente
from app.models.familia import Familia
from app.models.produto import Produto
from app.models.unidade_produto import UnidadeProduto
from app.models.unidade_medida import UnidadeMedida
from app.models.regra_global import RegraGlobal

# Importa os novos modelos de Endereçamento
from app.models.filial import Filial
from app.models.area import Area
from app.models.estrutura_fisica import EstruturaFisica
from app.models.finalidade_endereco import FinalidadeEndereco
from app.models.endereco import Endereco
from app.models.ua import UA
from app.models.historico_ua import HistoricoUA

from app.services.scheduler_service import iniciar_scheduler

# Cria as tabelas no SQL Server na inicialização
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # O que roda QUANDO O SERVIDOR LIGA
    robo_task = asyncio.create_task(iniciar_robo_vigia())
    yield
    # O que roda QUANDO O SERVIDOR DESLIGA
    robo_task.cancel()

app = FastAPI(
    title="WMS API",
    description="API para o sistema de gestão de armazém (WMS)",
    version="1.0.0",
    lifespan=lifespan
)

# Incluindo as rotas
app.include_router(produto_router.router, prefix="/produtos", tags=["Produtos"])
app.include_router(unidade_medida_router.router, prefix="/unidades-medida", tags=["Unidades de Medida"])
app.include_router(regra_global_router.router, prefix="/regras-globais", tags=["Regras Globais"])
app.include_router(familia_router.router, prefix="/familias", tags=["Famílias"])
app.include_router(endereco_router.router, prefix="/enderecos", tags=["Endereçamento"])

# Cadastros de Apoio do Endereçamento
app.include_router(filial_router.router, prefix="/filiais", tags=["Unidades e Filiais"])
app.include_router(area_router.router, prefix="/areas", tags=["Áreas do Armazém"])
app.include_router(estrutura_fisica_router.router, prefix="/estruturas-fisicas", tags=["Estruturas Físicas"])
app.include_router(finalidade_endereco_router.router, prefix="/finalidades-endereco", tags=["Finalidades de Endereço"])

# Gestão de Estoque
app.include_router(recebimento_router.router, prefix="/recebimentos", tags=["Recebimento (Inbound)"])
app.include_router(ua_router.router, prefix="/uas", tags=["Unidades de Armazenamento (UAs)"])
app.include_router(solicitacao_transferencia_router.router, prefix="/solicitacoes-transferencia", tags=["Transferências entre Filiais"])

# Inicia as tarefas de segundo plano assim que o servidor ligar
@app.on_event("startup")
def iniciar_rotinas_em_segundo_plano():
    iniciar_scheduler()

@app.get("/")
def raiz():
    return {"mensagem": "WMS Online e operante!"}