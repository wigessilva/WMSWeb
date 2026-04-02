from fastapi import Header, HTTPException

def obter_filial_atual(x_filial_id: int = Header(None, alias="X-Filial-Id")):
    # Verifica se o frontend enviou o ID da filial no cabecalho
    if not x_filial_id:
        raise HTTPException(
            status_code=400,
            detail="O cabecalho X-Filial-Id e obrigatorio para esta operacao."
        )
    return x_filial_id