from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

class UsuarioBase(BaseModel):
    nome: str
    login: str
    perfil_id: int
    ativo: bool = True

class UsuarioCriar(UsuarioBase):
    senha: str
    filiais_ids: List[int] = []

    @field_validator('senha')
    @classmethod
    def validar_senha(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError('A senha deve conter apenas números.')
        if len(v) != 6:
            raise ValueError('A senha deve ter exatamente 6 dígitos.')
        return v

class FilialResumo(BaseModel):
    id: int
    nome: str
    url_api: Optional[str] = None

    class Config:
        from_attributes = True

class UsuarioSchema(UsuarioBase):
    id: int
    ultimo_login: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    filiais: List[FilialResumo] = []
    # Nota: A senha_hash nunca deve vir para o Frontend, por isso não a colocamos aqui!

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    login: str
    senha: str


class UsuarioAtualizar(BaseModel):
    nome: Optional[str] = None
    login: Optional[str] = None
    senha: Optional[str] = None
    perfil_id: Optional[int] = None
    usuario_logado_id: int
    senha_autorizacao: str