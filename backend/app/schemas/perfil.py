from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PermissaoSchema(BaseModel):
    id: int
    chave: str
    descricao: Optional[str] = None

    class Config:
        from_attributes = True

class PerfilBase(BaseModel):
    nome: str
    descricao: Optional[str] = None

class PerfilCriar(PerfilBase):
    permissoes: List[str] = [] # Lista de chaves das permissões
    editor_permissoes: Optional[List[str]] = None  # Permissões do editor (para validação de delegação)

class PerfilSchema(PerfilBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    rowversion: int
    permissoes: List[PermissaoSchema] = []

    class Config:
        from_attributes = True