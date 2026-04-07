from sqlalchemy.orm import Session
from ..models.perfil import Perfil
from ..models.permissao import Permissao
from ..models.usuario import Usuario
from ..core.security import obter_hash_senha
from ..models.configuracao_integracao import ConfiguracaoIntegracao
from ..models.parametros_mestres import ParametrosMestres

# Catálogo completo de permissões do sistema
# Formato: (chave, descrição)
PERMISSOES_SEED = [
    # Recebimento
    ("RECEBIMENTO.LIBERAR",           "Liberar romaneio para conferência"),
    ("RECEBIMENTO.LIBERAR_SEM_OC",    "Liberar romaneio sem ordem de compra"),
    ("RECEBIMENTO.CONFERIR",          "Realizar conferência física de itens"),
    ("RECEBIMENTO.FINALIZAR",         "Finalizar recebimento"),
    ("RECEBIMENTO.REJEITAR",          "Rejeitar nota"),
    ("RECEBIMENTO.VER_QUANTIDADES",   "Ver quantidades esperadas"),
    ("RECEBIMENTO.ALTERAR_DESTINO",   "Alterar destino dos itens do romaneio"),
    ("RECEBIMENTO.EDITAR_OC",         "Editar ordem de compra vinculada"),
    ("RECEBIMENTO.VINCULAR_SKU",      "Vincular SKU"),

    # Estoque
    ("ESTOQUE.TRANSFERIR",            "Criar e aprovar transferências entre filiais"),
    ("ESTOQUE.GERENCIAR_UAS",         "Gerenciar Unidades de Armazenamento"),

    # Cadastros
    ("CADASTROS.PRODUTOS",            "Gerenciar Produtos e Famílias"),
    ("CADASTROS.UNIDADES_MEDIDA",     "Gerenciar Unidades de Medida"),
    ("CADASTROS.VINCULOS_UNIDADE",    "Gerenciar Vínculos de Unidades"),
    ("CADASTROS.VINCULOS_FORNECEDOR", "Excluir vínculos de fornecedores"),
    ("CADASTROS.FILIAIS",             "Gerenciar Filiais"),
    ("CADASTROS.ENDERECOS",           "Gerenciar Endereçamento"),

    # Configurações
    ("CONFIGURACOES.PARAMETROS",      "Alterar parâmetros mestres do sistema"),
    ("CONFIGURACOES.INTEGRACAO",      "Configurar pasta XML"),

    # Gestão de Acessos
    ("ACESSOS.PERFIS",                "Gerenciar Perfis e Permissões"),
    ("ACESSOS.USUARIOS",              "Gerenciar Usuários"),
]


def inicializar_dados_padrao(db: Session):
    # 1. Garante todas as permissões no banco
    permissoes_existentes = {p.chave for p in db.query(Permissao).all()}
    novas_permissoes = []
    
    for chave, descricao in PERMISSOES_SEED:
        if chave not in permissoes_existentes:
            nova = Permissao(chave=chave, descricao=descricao)
            db.add(nova)
            novas_permissoes.append(chave)
    
    if novas_permissoes:
        db.commit()

    # 2. Garante o perfil Administrador com TODAS as permissões
    todas_permissoes = db.query(Permissao).all()
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()

    if not perfil_admin:
        perfil_admin = Perfil(nome="Administrador", descricao="Acesso total ao sistema. Nao pode ser alterado.")
        perfil_admin.permissoes = todas_permissoes
        db.add(perfil_admin)
        db.commit()
        db.refresh(perfil_admin)
    else:
        # Garante que o admin tenha TODAS as permissões (inclusive novas)
        chaves_admin = {p.chave for p in perfil_admin.permissoes}
        for perm in todas_permissoes:
            if perm.chave not in chaves_admin:
                perfil_admin.permissoes.append(perm)
        db.commit()

    # 3. Verifica se já existe o usuário admin master
    usuario_admin = db.query(Usuario).filter(Usuario.login == "admin").first()

    if not usuario_admin:
        senha_padrao_hash = obter_hash_senha("123456")
        usuario_admin = Usuario(
            nome="Administrador do Sistema",
            login="admin",
            senha_hash=senha_padrao_hash,
            perfil_id=perfil_admin.id,
            ativo=True
        )
        db.add(usuario_admin)
        db.commit()

    # 4. Inicializa Parametros Mestres se nao existir
    parametros = db.query(ParametrosMestres).first()
    if not parametros:
        parametros = ParametrosMestres()
        db.add(parametros)

    # 5. Inicializa a Configuracao do Robo NFe se nao existir
    config_robo = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()
    if not config_robo:
        config_robo = ConfiguracaoIntegracao(nome_servico="ROBO_NFE", caminho_diretorio="", ativo=True)
        db.add(config_robo)

    db.commit()