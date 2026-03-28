from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.db.database import SessionLocal, SessionLocalERP
from app.services.erp_sync_service import ServicoSincronizacaoERP
import logging

# Configuração básica de log para vermos o WMS trabalhando sozinho no terminal
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def rotina_sincronizacao():
    logger.info("Iniciando rotina automática de sincronização com o ERP...")

    # Abrindo as conexões com os bancos manualmente
    db_wms = SessionLocal()
    db_erp = SessionLocalERP()

    try:
        resultado = ServicoSincronizacaoERP.sincronizar_produtos(db_wms=db_wms, db_erp=db_erp)
        logger.info(f"Sincronização automática concluída: {resultado}")
    except Exception as e:
        logger.error(f"Erro na sincronização automática: {e}")
    finally:
        # É obrigatório fechar as conexões para não estourar o limite do SQL Server
        db_wms.close()
        db_erp.close()


def iniciar_scheduler():
    scheduler = BackgroundScheduler()

    # Configurado para rodar a cada 30 minutos (você pode alterar para hours=1, days=1, etc)
    scheduler.add_job(
        rotina_sincronizacao,
        trigger=IntervalTrigger(minutes=30),
        id="sync_erp_produtos",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Relógio do WMS iniciado. Rotinas em segundo plano ativadas.")