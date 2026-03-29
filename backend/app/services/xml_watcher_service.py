import os
import shutil
import asyncio
import xml.etree.ElementTree as ET
from ..models.configuracao_integracao import ConfiguracaoIntegracao
from app.db.database import SessionLocal
from app.schemas.recebimento import RecebimentoCriar, RecebimentoItemCriar
from app.services.recebimento_service import RecebimentoService

# Caminhos das pastas (Pode mudar para o caminho que desejar no seu Windows/Linux)
PASTA_XML = "./xml_entrada"
PASTA_PROCESSADOS = os.path.join(PASTA_XML, "Processados")
PASTA_ERRO = os.path.join(PASTA_XML, "Com_Erro")


def extrair_dados_nfe(caminho_arquivo):
    # Lê o XML da NFe e extrai os dados ignorando os namespaces complexos.
    tree = ET.parse(caminho_arquivo)
    root = tree.getroot()

    # Função interna para encontrar tags ignorando o Namespace (ex: {http://...}nNF)
    def find_tag(element, tag_name):
        for child in element.iter():
            if child.tag.endswith(tag_name):
                return child
        return None

    # 1. Dados do Cabeçalho (Romaneio)
    nfe = find_tag(root, 'nNF').text if find_tag(root, 'nNF') is not None else "000000"

    emitente = find_tag(root, 'emit')
    cnpj_fornecedor = find_tag(emitente, 'CNPJ').text if find_tag(emitente, 'CNPJ') is not None else ""
    fornecedor = find_tag(emitente, 'xNome').text if find_tag(emitente,
                                                              'xNome') is not None else "Fornecedor Desconhecido"

    # 2. Dados dos Itens
    itens = []
    for det in root.iter():
        if det.tag.endswith('det'):
            prod = find_tag(det, 'prod')
            if prod is not None:
                item = RecebimentoItemCriar(
                    descricao=find_tag(prod, 'xProd').text,
                    qtd_nota=float(find_tag(prod, 'qCom').text),
                    und=find_tag(prod, 'uCom').text
                )
                itens.append(item)

    # Monta o formulário exato que a nossa API já espera
    dados_recebimento = RecebimentoCriar(
        nfe=nfe,
        fornecedor=fornecedor[:150],  # Limita o tamanho caso venha gigante
        itens=itens
    )

    return dados_recebimento, cnpj_fornecedor


async def obter_configuracao_robo(db):
    return db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()


async def iniciar_robo_vigia():
    print("🤖 Robô Vigia iniciado. Aguardando ativação e configuração de diretório...")

    while True:
        db = SessionLocal()
        try:
            config = await obter_configuracao_robo(db)

            # Só roda se existir configuração, se tiver um caminho preenchido e se estiver ATIVO
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
                        print(f"📄 Processando XML: {arquivo}...")

                        try:
                            dados, cnpj_forn = extrair_dados_nfe(caminho_completo)
                            RecebimentoService.importar_xml(db=db, dados=dados, cnpj_fornecedor=cnpj_forn)

                            shutil.move(caminho_completo, os.path.join(pasta_processados, arquivo))
                            print(f"Sucesso! {arquivo} importado e movido para Processados.")
                        except Exception as e:
                            print(f"Erro ao processar {arquivo}: {str(e)}")
                            shutil.move(caminho_completo, os.path.join(pasta_erro, arquivo))
                else:
                    # Silencia o erro contínuo se a pasta não existir, apenas avisa uma vez (lógica simplificada)
                    pass

        except Exception as e:
            print(f"Erro no loop do Robô: {e}")
        finally:
            db.close()

        await asyncio.sleep(10)