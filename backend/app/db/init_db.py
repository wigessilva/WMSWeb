from sqlalchemy.orm import Session
from ..models.perfil import Perfil
from ..models.usuario import Usuario
from ..core.security import obter_hash_senha
from ..models.configuracao_integracao import ConfiguracaoIntegracao
from ..models.parametros_mestres import ParametrosMestres


def inicializar_dados_padrao(db: Session):
    # 1. Verifica se já existe o perfil Administrador
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()

    if not perfil_admin:
        perfil_admin = Perfil(nome="Administrador", descricao="Acesso total ao sistema. Nao pode ser alterado.")
        db.add(perfil_admin)
        db.commit()
        db.refresh(perfil_admin)

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