from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.configuracao_integracao import ConfiguracaoIntegracao

router = APIRouter()


# O modelo agora só pede o diretório
class ConfigUpdate(BaseModel):
    caminho_diretorio: str


@router.get("/robo-nfe")
def obter_configuracao(db: Session = Depends(get_db)):
    config = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()
    return {"caminho_diretorio": config.caminho_diretorio if config else ""}


@router.put("/robo-nfe")
def atualizar_configuracao(dados: ConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(ConfiguracaoIntegracao).filter(ConfiguracaoIntegracao.nome_servico == "ROBO_NFE").first()

    # Se por algum motivo não existir, cria um novo
    if not config:
        config = ConfiguracaoIntegracao(nome_servico="ROBO_NFE", caminho_diretorio=dados.caminho_diretorio, ativo=True)
        db.add(config)
    else:
        config.caminho_diretorio = dados.caminho_diretorio
        config.ativo = True  # Garante que está sempre ativo

    db.commit()
    db.refresh(config)
    return {"caminho_diretorio": config.caminho_diretorio}