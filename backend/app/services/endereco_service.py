from sqlalchemy.orm import Session
from ..models.endereco import Endereco
from ..models.area import Area
from ..schemas.endereco import EnderecoLoteCriar


class EnderecoService:
    @staticmethod
    def gerar_em_lote(db: Session, dados: EnderecoLoteCriar):
        # 1. Busca a área para obter a letra e compor o código formatado
        area = db.query(Area).filter(Area.id == dados.area_id).first()
        if not area:
            raise ValueError("Área não encontrada.")

        novos_enderecos = []

        # 2. Ciclos encadeados para gerar todas as combinações matemáticas
        for r in range(dados.rua_inicio, dados.rua_fim + 1):
            for p in range(dados.predio_inicio, dados.predio_fim + 1):
                for n in range(dados.nivel_inicio, dados.nivel_fim + 1):
                    for pos in range(dados.posicao_inicio, dados.posicao_fim + 1):
                        # Formata o código com zeros à esquerda: Letra-Rua-Predio-Nivel-Posicao (ex: A-01-12-03-05)
                        codigo = f"{area.letra}-{r:02d}-{p:02d}-{n:02d}-{pos:02d}"

                        endereco = Endereco(
                            area_id=dados.area_id,
                            rua=r,
                            predio=p,
                            nivel=n,
                            posicao=pos,
                            codigo_formatado=codigo,
                            estrutura_fisica_id=dados.estrutura_fisica_id,
                            finalidade_id=dados.finalidade_id,
                            peso_maximo_kg=dados.peso_maximo_kg,
                            produto_id=dados.produto_id,
                            capacidade_maxima_und=dados.capacidade_maxima_und
                        )
                        novos_enderecos.append(endereco)

        # 3. Inserção massiva na base de dados (Garante a performance e o princípio ACID)
        db.add_all(novos_enderecos)
        db.commit()

        return len(novos_enderecos)