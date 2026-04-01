from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class UsuarioBase(BaseModel):
    nome: str
    login: str
    perfil_id: int
    ativo: bool = True

class UsuarioCriar(UsuarioBase):
    senha: str

    @field_validator('senha')
    @classmethod
    def validar_senha(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError('A senha deve conter apenas números.')
        if len(v) != 6:
            raise ValueError('A senha deve ter exatamente 6 dígitos.')
        return v

class UsuarioSchema(UsuarioBase):
    id: int
    ultimo_login: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    # Nota: A senha_hash nunca deve vir para o Frontend, por isso não a colocamos aqui!

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    login: str
    senha: str