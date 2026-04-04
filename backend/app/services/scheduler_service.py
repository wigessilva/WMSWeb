from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.db.database import SessionLocal, SessionLocalERP
from app.services.erp_sync_service import ServicoSincronizacaoERP
import logging
from datetime import datetime

# Configuração básica de log para vermos o WMS trabalhando sozinho no terminal
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def rotina_sincronizacao():
    logger.info("🔄 Iniciando rotina automática de sincronização com o ERP...")

    # Abrindo as conexões com os bancos manualmente
    db_wms = SessionLocal()
    db_erp = SessionLocalERP()

    try:
        # 1. Primeiro sincroniza as Unidades de Medida (pois os produtos dependem delas)
        res_unidades = ServicoSincronizacaoERP.sincronizar_unidades_medida(db_wms=db_wms, db_erp=db_erp)

        # 2. Depois sincroniza os Produtos (SKU, Descrição)
        res_produtos = ServicoSincronizacaoERP.sincronizar_produtos(db_wms=db_wms, db_erp=db_erp)

        # 3. Por fim, cruza Produtos com Unidades (Fatores de Conversão)
        res_prod_unids = ServicoSincronizacaoERP.sincronizar_produtos_unidades(db_wms=db_wms, db_erp=db_erp)

        logger.info(f"📊 Sinc. Unidades: {res_unidades}")
        logger.info(f"📊 Sinc. Produtos: {res_produtos}")
        logger.info(f"📊 Sinc. Unidades do Produto: {res_prod_unids}")
        logger.info("✅ Sincronização automática concluída com sucesso.")
    except Exception as e:
        logger.error(f"❌ Erro na sincronização automática: {e}")
    finally:
        # É obrigatório fechar as conexões para não estourar o limite do SQL Server
        db_wms.close()
        db_erp.close()


def iniciar_scheduler():
    scheduler = BackgroundScheduler()

    # O "next_run_time=datetime.now()" obriga a rotina a rodar no exato milissegundo que o servidor ligar
    scheduler.add_job(
        rotina_sincronizacao,
        trigger=IntervalTrigger(minutes=30),
        id="sync_erp_produtos",
        replace_existing=True,
        next_run_time=datetime.now()
    )

    scheduler.start()
    logger.info("⏰ Relógio do WMS iniciado. Rotinas em segundo plano ativadas.")