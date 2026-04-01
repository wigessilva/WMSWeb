from passlib.context import CryptContext

# Configura o Argon2 como o algoritmo padrão de hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def obter_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)