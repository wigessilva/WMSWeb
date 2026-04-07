from sqlalchemy.orm import Session
from ..models.perfil import Perfil
from ..models.permissao import Permissao
from ..models.usuario import Usuario
from ..core.security import obter_hash_senha
from ..models.configuracao_integracao import ConfiguracaoIntegracao
from ..models.parametros_mestres import ParametrosMestres


def inicializar_dados_padrao(db: Session):
    # 1. Verifica se já existe o perfil Administrador
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()

    # Garante a existência da permissão padrão
    permissao_liberar = db.query(Permissao).filter(Permissao.chave == "RECEBIMENTO.LIBERAR_SEM_OC").first()
    if not permissao_liberar:
        permissao_liberar = Permissao(
            chave="RECEBIMENTO.LIBERAR_SEM_OC", 
            descricao="Permite liberar romaneio sem OC vinculada"
        )
        db.add(permissao_liberar)
        db.commit()
        db.refresh(permissao_liberar)

    if not perfil_admin:
        perfil_admin = Perfil(nome="Administrador", descricao="Acesso total ao sistema. Nao pode ser alterado.")
        perfil_admin.permissoes.append(permissao_liberar)
        db.add(perfil_admin)
        db.commit()
        db.refresh(perfil_admin)
    else:
        # Se o admin já existe, garante que ele tenha a permissão
        if permissao_liberar not in perfil_admin.permissoes:
            perfil_admin.permissoes.append(permissao_liberar)
            db.commit()

    # 2. Verifica se já existe o usuário admin master
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

    # 3. Inicializa Parametros Mestres se nao existir
    parametros = db.query(ParametrosMestres).first()
    if not parametros:
        parametros = ParametrosMestres()
        db.add(parametros)

    # 4. Inicializa a Configuracao do Robo NFe se nao existir
    config_robo = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()
    if not config_robo:
        config_robo = ConfiguracaoIntegracao(nome_servico="ROBO_NFE", caminho_diretorio="", ativo=True)
        db.add(config_robo)

    db.commit()