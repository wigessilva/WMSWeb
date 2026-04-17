import os
import shutil
import sys
import importlib
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar os módulos da app
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from app.db.database import SessionLocal
from app.db.database import SessionLocal

# Importa dinamicamente todos os modelos para registrar no SQLAlchemy
import glob
from os.path import dirname, basename, isfile, join
modules = glob.glob(join(root_dir / "app" / "models", "*.py"))
__all__ = [ basename(f)[:-3] for f in modules if isfile(f) and not f.endswith('__init__.py')]

for module_name in __all__:
    importlib.import_module(f"app.models.{module_name}")

from app.models.recebimento import Recebimento, RecebimentoItem, RecebimentoSessoes, RecebimentoLeitura
from app.models.historico_xml import HistoricoXML
from app.models.log_transicao import LogTransicao
from app.models.ua import UA
from app.models.historico_ua import HistoricoUA
from app.models.configuracao_integracao import ConfiguracaoIntegracao

def reset_recebimento():
    db = SessionLocal()
    try:
        print("🔍 Localizando configuração do Robô XML...")
        config = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()
        
        if config and config.caminho_diretorio and os.path.exists(config.caminho_diretorio):
            pasta_base = config.caminho_diretorio
            pasta_processados = os.path.join(pasta_base, "Processados")
            pasta_erro = os.path.join(pasta_base, "Com_Erro")

            # Mover arquivos de Processados para a raiz
            if os.path.exists(pasta_processados):
                print(f"📁 Movendo arquivos de {pasta_processados} para a raiz...")
                for arquivo in os.listdir(pasta_processados):
                    if arquivo.lower().endswith('.xml'):
                        try:
                            shutil.move(os.path.join(pasta_processados, arquivo), os.path.join(pasta_base, arquivo))
                            print(f"  -> {arquivo} movido.")
                        except Exception as e:
                            print(f"  -> ❌ Erro ao mover {arquivo}: {e}")

            # Mover arquivos de Com_Erro para a raiz
            if os.path.exists(pasta_erro):
                print(f"📁 Movendo arquivos de {pasta_erro} para a raiz...")
                for arquivo in os.listdir(pasta_erro):
                    if arquivo.lower().endswith('.xml'):
                        try:
                            # Caso o arquivo já exista na raiz (por algum motivo), removemos da raiz primeiro
                            target = os.path.join(pasta_base, arquivo)
                            if os.path.exists(target):
                                os.remove(target)
                            shutil.move(os.path.join(pasta_erro, arquivo), target)
                            print(f"  -> {arquivo} movido.")
                        except Exception as e:
                            print(f"  -> ❌ Erro ao mover {arquivo}: {e}")
        else:
            print("⚠️ Pasta de XML não configurada ou não encontrada. Pulando movimentação de arquivos.")

        print("\n🗑️ Removendo dados do banco...")

        # 1. Historico de Transições
        print("  -> Limpando LogTransicao (Recebimentos)...")
        db.query(LogTransicao).filter(LogTransicao.tabela.in_(['Recebimentos', 'RecebimentoItens', 'RecebimentoLeituras'])).delete(synchronize_session=False)

        # 2. Historico de XML
        print("  -> Limpando HistoricoXML...")
        db.query(HistoricoXML).delete(synchronize_session=False)

        # 3. Dependências de Recebimento (Ordem correta para SQL Server)
        print("  -> Limpando RecebimentoLeituras...")
        db.query(RecebimentoLeitura).delete(synchronize_session=False)

        print("  -> Limpando RecebimentoSessoes...")
        db.query(RecebimentoSessoes).delete(synchronize_session=False)

        print("  -> Limpando RecebimentoItens...")
        db.query(RecebimentoItem).delete(synchronize_session=False)

        print("  -> Limpando Recebimentos...")
        db.query(Recebimento).delete(synchronize_session=False)

        # 4. Historico de UAs
        print("  -> Limpando HistoricoUA...")
        db.query(HistoricoUA).delete(synchronize_session=False)

        # 5. UAs
        print("  -> Limpando UAs...")
        db.query(UA).delete(synchronize_session=False)

        # Reseta os contadores de ID (Identity Seed) no SQL Server para começarem do 1
        print("\n🔧 Resetando contadores de ID...")
        from sqlalchemy import text
        tabelas = [
            'LogTransicoes', 'HistoricoXML', 'RecebimentoLeituras', 
            'RecebimentoSessoes', 'RecebimentoItens', 'Recebimentos',
            'HistoricoUA', 'UAs'
        ]
        for tabela in tabelas:
            try:
                db.execute(text(f"DBCC CHECKIDENT ('{tabela}', RESEED, 0)"))
            except Exception as e:
                # Algumas tabelas podem não ter coluna identity, apenas ignoramos
                pass

        db.commit()
        print("\n✨ Reset concluído com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro durante o reset: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_recebimento()
