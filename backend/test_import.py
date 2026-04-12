from app.services.xml_watcher_service import extrair_dados_nfe
from app.services.recebimento_service import RecebimentoService
from app.db.database import SessionLocal, SessionLocalERP
import os
import sys

def test():
    xml_path = r"d:\PyCharm\Projects\WMSWeb\XML\nfe_teste_bonificacao.xml"
    if not os.path.exists(xml_path):
        # Tenta em Com_Erro
        xml_path = r"d:\PyCharm\Projects\WMSWeb\XML\Com_Erro\nfe_teste_bonificacao.xml"
        if not os.path.exists(xml_path):
            print("XML not found.")
            return

    db = SessionLocal()
    db_erp = SessionLocalERP()
    try:
        print(f"Testing import for: {xml_path}")
        dados, cnpj = extrair_dados_nfe(xml_path)
        print("Data extracted successfully.")
        RecebimentoService.importar_xml(db, db_erp, dados, cnpj)
        print("Import successful!")
    except Exception as e:
        print(f"Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        db_erp.close()

if __name__ == "__main__":
    test()
