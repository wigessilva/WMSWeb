import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import perfil_router, usuario_router, auth_router

from app.models.perfil import Perfil
from app.models.usuario import Usuario

from app.db.database import SessionLocal
from app.db.init_db import inicializar_dados_padrao

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
    recebimento_router,
    configuracao_router,
    vinculo_unidade_router
)

# Importa os modelos para que o SQLAlchemy crie as relações corretamente
from app.models.familia import Familia
from app.models.produto import Produto
from app.models.unidade_produto import UnidadeProduto
from app.models.unidade_medida import UnidadeMedida
from app.models.vinculo_unidade import VinculoUnidade
from app.models.regra_global import RegraGlobal
from app.models.historico_xml import HistoricoXML

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

db = SessionLocal()
try:
    inicializar_dados_padrao(db)
finally:
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # O que roda QUANDO O SERVIDOR LIGA (agrupamos tudo aqui)
    robo_task = asyncio.create_task(iniciar_robo_vigia())
    iniciar_scheduler()
    yield
    # O que roda QUANDO O SERVIDOR DESLIGA
    robo_task.cancel()

app = FastAPI(
    title="WMS API",
    description="API para o sistema de gestão de armazém (WMS)",
    version="1.0.0",
    lifespan=lifespan
)

# --- CONFIGURAÇÃO DE CORS (O PASSE LIVRE PARA O REACT) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------------------

# Incluindo as rotas
app.include_router(produto_router.router, prefix="/produtos", tags=["Produtos"])
app.include_router(unidade_medida_router.router, prefix="/unidades-medida", tags=["Unidades de Medida"])
app.include_router(vinculo_unidade_router.router, prefix="/vinculos-unidade", tags=["Vínculos de Unidades"])
app.include_router(regra_global_router.router, prefix="/regras-globais", tags=["Regras Globais"])
app.include_router(familia_router.router, prefix="/familias", tags=["Famílias"])
app.include_router(endereco_router.router, prefix="/enderecos", tags=["Endereçamento"])

# AQUI ESTÁ A ROTA DA CONFIGURAÇÃO!
app.include_router(configuracao_router.router, prefix="/api/v1/configuracao", tags=["Configurações"])

# Cadastros de Apoio do Endereçamento
app.include_router(filial_router.router, prefix="/filiais", tags=["Unidades e Filiais"])
app.include_router(area_router.router, prefix="/areas", tags=["Áreas do Armazém"])
app.include_router(estrutura_fisica_router.router, prefix="/estruturas-fisicas", tags=["Estruturas Físicas"])
app.include_router(finalidade_endereco_router.router, prefix="/finalidades-endereco", tags=["Finalidades de Endereço"])

# Gestão de Estoque
app.include_router(recebimento_router.router, prefix="/recebimentos", tags=["Recebimento (Inbound)"])
app.include_router(ua_router.router, prefix="/uas", tags=["Unidades de Armazenamento (UAs)"])
app.include_router(solicitacao_transferencia_router.router, prefix="/solicitacoes-transferencia", tags=["Transferências entre Filiais"])

# Gestão de Acessos
app.include_router(auth_router.router, prefix="/auth", tags=["Autenticação"])
app.include_router(perfil_router.router, prefix="/perfis", tags=["Perfis de Acesso"])
app.include_router(usuario_router.router, prefix="/usuarios", tags=["Utilizadores"])

@app.get("/")
def raiz():
    return {"mensagem": "WMS Online e operante!"}