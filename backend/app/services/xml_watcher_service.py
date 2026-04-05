import os
import shutil
import signal
import asyncio
import xml.etree.ElementTree as ET
from app.db.database import SessionLocal, SessionLocalERP
from app.schemas.recebimento import RecebimentoCriar, RecebimentoItemCriar
from app.services.recebimento_service import RecebimentoService
from app.models.configuracao_integracao import ConfiguracaoIntegracao


def extrair_dados_nfe(caminho_arquivo):
    # Lê o XML da NFe e extrai os dados ignorando os namespaces complexos.
    tree = ET.parse(caminho_arquivo)
    root = tree.getroot()

    # Função auxiliar para encontrar tags XML
    def find_tag(element, tag_name):
        if element is None: return None
        for child in element.iter():
            if child.tag.endswith(tag_name):
                return child
        return None

    # 1. Dados do Cabeçalho
    tag_nfe = find_tag(root, 'nNF')
    nfe = tag_nfe.text if tag_nfe is not None else "000000"

    emitente = find_tag(root, 'emit')
    tag_cnpj = find_tag(emitente, 'CNPJ')
    cnpj_fornecedor = tag_cnpj.text if tag_cnpj is not None else ""

    tag_nome = find_tag(emitente, 'xNome')
    fornecedor = tag_nome.text if tag_nome is not None else "Fornecedor Desconhecido"

    # Novos dados de Cabeçalho/Auditoria
    tag_chave = find_tag(root, 'chNFe')
    chave_acesso = tag_chave.text if tag_chave is not None else None

    tag_data = find_tag(root, 'dhEmi')  # Tenta dhEmi primeiro (NFe 4.0)
    if not tag_data:
        tag_data = find_tag(root, 'dEmi')  # Fallback para NFe antiga

    data_emissao = None
    if tag_data is not None and tag_data.text:
        # Pega apenas os primeiros 19 caracteres (YYYY-MM-DDTHH:MM:SS)
        data_string = tag_data.text[:19]
        try:
            from datetime import datetime
            data_emissao = datetime.fromisoformat(data_string)
        except Exception:
            data_emissao = None

    # 2. Dados dos Itens
    itens = []
    for det in root.iter():
        if det.tag.endswith('det'):
            prod = find_tag(det, 'prod')
            if prod is not None:
                item = RecebimentoItemCriar(
                    descricao=find_tag(prod, 'xProd').text if find_tag(prod, 'xProd') is not None else "Item Sem Nome",
                    qtd_nota=float(find_tag(prod, 'qCom').text) if find_tag(prod, 'qCom') is not None else 0.0,
                    und=find_tag(prod, 'uCom').text if find_tag(prod, 'uCom') is not None else "UN",
                    codigo_fornecedor=find_tag(prod, 'cProd').text if find_tag(prod, 'cProd') is not None else None
                )
                itens.append(item)

    # Tenta encontrar a tag xPed (Ordem de Compra) no XML
    tag_xped = None
    for elem in root.iter():
        if elem.tag.endswith('xPed'):
            tag_xped = elem
            break

    oc_extraida = tag_xped.text if tag_xped is not None else None

    # 3. Monta o formulário de envio
    dados_recebimento = RecebimentoCriar(
        nfe=nfe,
        oc=oc_extraida,  # Passa a OC para o schema
        fornecedor=fornecedor[:150],
        itens=itens
    )

    # Devolvemos agora os 4 elementos necessários para o serviço de recebimento
    return dados_recebimento, cnpj_fornecedor, chave_acesso, data_emissao

# Flag para controle do robô se necessário
deve_parar = False

async def iniciar_robo_vigia():

    print("🤖 Robô Vigia iniciado. A aguardar configuração na base de dados...")

    try:
        while True:
            db = SessionLocal()
            db_erp = SessionLocalERP()  # Instancia a conexão com o ERP
            try:
                # Pede à base de dados o caminho que o usuário guardou no ecrã
                config = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()

                # Só trabalha se o robô estiver ativo e tiver um caminho preenchido

    global deve_parar
    print("🤖 Robô Vigia iniciado via Lifespan.")

    try:
        while not deve_parar:
            db = SessionLocal()
            db_erp = SessionLocalERP()
            try:
                config = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()


                if config and config.ativo and config.caminho_diretorio:
                    pasta_base = config.caminho_diretorio

                    if os.path.exists(pasta_base):
                        pasta_processados = os.path.join(pasta_base, "Processados")
                        pasta_erro = os.path.join(pasta_base, "Com_Erro")

                        os.makedirs(pasta_processados, exist_ok=True)
                        os.makedirs(pasta_erro, exist_ok=True)

                        arquivos = [f for f in os.listdir(pasta_base) if f.lower().endswith('.xml')]

                        for arquivo in arquivos:
                            caminho_completo = os.path.join(pasta_base, arquivo)
                            print(f"📄 Robô a processar XML: {arquivo}...")

                            try:

                                dados, cnpj_forn = extrair_dados_nfe(caminho_completo)

                                # Adicionamos o db_erp aqui na chamada do serviço
                                RecebimentoService.importar_xml(db=db, db_erp=db_erp, dados=dados,
                                                                cnpj_fornecedor=cnpj_forn)

                                dados, cnpj_forn, chave, dt_emissao = extrair_dados_nfe(caminho_completo)

                                RecebimentoService.importar_xml(
                                    db=db,
                                    db_erp=db_erp,
                                    dados=dados,
                                    cnpj_fornecedor=cnpj_forn,
                                    chave_acesso=chave,
                                    data_emissao=dt_emissao
                                )


                                shutil.move(caminho_completo, os.path.join(pasta_processados, arquivo))
                                print(f"✅ Sucesso! {arquivo} importado e movido.")
                            except Exception as e:
                                print(f"❌ Erro ao processar {arquivo}: {str(e)}")


                                db.rollback()

                                shutil.move(caminho_completo, os.path.join(pasta_erro, arquivo))
            except Exception as e:
                print(f"⚠️ Erro no loop principal do Robô: {e}")
            finally:
                db.close()

                db_erp.close()  # Fecha a conexão do ERP para não prender recursos

            await asyncio.sleep(10)
    except asyncio.CancelledError:
        print("🛑 Sinal de encerramento recebido. Desligando o Robô Vigia de forma segura...")
        raise

                db_erp.close()

            await asyncio.sleep(10)
    except asyncio.CancelledError:
        print("🛑 Robô vigia recebeu ordem de cancelamento e está a parar...")
    finally:
        print("✅ Recursos do robô libertados.")

