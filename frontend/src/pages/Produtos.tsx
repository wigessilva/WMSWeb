import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ActionToolbar } from '../components/ActionToolbar'
import { produtoService } from '../services/produtoService'
import { familiaService } from '../services/familiaService'
import { parametrosMestresService } from '../services/parametrosMestresService'
import { unidadeMedidaService } from '../services/unidadeMedidaService'
import type { Produto } from '../types/produto'
import type { Familia } from '../types/familia'
import type { UnidadeMedida } from '../types/unidadeMedida'

const validarEAN = (ean: string) => {
  if (!ean) return true; // Se estiver vazio, passa (pois é opcional)
  const limpo = ean.replace(/\D/g, ''); // Remove o que não for número

  // EANs padrão costumam ter 8, 12, 13 ou 14 dígitos
  if (![8, 12, 13, 14].includes(limpo.length)) return false;

  let soma = 0;
  let multiplicador = 3;
  // O cálculo do dígito verificador intercala multiplicações por 3 e 1 de trás pra frente
  for (let i = limpo.length - 2; i >= 0; i--) {
    soma += parseInt(limpo[i]) * multiplicador;
    multiplicador = multiplicador === 3 ? 1 : 3;
  }

  const digitoEsperado = (10 - (soma % 10)) % 10;
  return digitoEsperado === parseInt(limpo[limpo.length - 1]);
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

  // Estados do Modal e Dependências
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'cadastro' | 'parametros'>('cadastro')
  const [salvando, setSalvando] = useState(false)
  const [familias, setFamilias] = useState<Familia[]>([])
  const [parametrosGlobais, setParametrosGlobais] = useState<any>(null)
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([])

  // Estados dos Cadeados (Locks)
  const [lockVariavel, setLockVariavel] = useState(true)
  const [lockArea, setLockArea] = useState(true)
  const [lockValidade, setLockValidade] = useState(true)
  const [lockLote, setLockLote] = useState(true)
  const [lockGiro, setLockGiro] = useState(true)
  const [lockBloqueios, setLockBloqueios] = useState(true)

  // Estados do Cadastro
  const [familiaId, setFamiliaId] = useState<number | "">("")
  const [statusProduto, setStatusProduto] = useState("ativo")
  const [produtoBloqueado, setProdutoBloqueado] = useState(false)
  const [codigoFornecedor, setCodigoFornecedor] = useState("")
  const [modalMotivoAberto, setModalMotivoAberto] = useState(false)
  const [motivoBloqueio, setMotivoBloqueio] = useState("")

  // Estados de Edição de Unidade
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<any>(null)
  const [modalEditarUnidadeAberto, setModalEditarUnidadeAberto] = useState(false)
  const [unidadeEditando, setUnidadeEditando] = useState<any>(null)
  const [tipoUnidade, setTipoUnidade] = useState("produto")
  const [largura, setLargura] = useState("")
  const [unidadeLargura, setUnidadeLargura] = useState("mm")
  const [comprimento, setComprimento] = useState("")
  const [unidadeComprimento, setUnidadeComprimento] = useState("mm")
  const [altura, setAltura] = useState("")
  const [unidadeAltura, setUnidadeAltura] = useState("mm")
  const [pesoBruto, setPesoBruto] = useState("")
  const [eanGtin, setEanGtin] = useState("")

  // Estados do Modal de Confirmação de Peso
  const [modalConfirmarPesoAberto, setModalConfirmarPesoAberto] = useState(false)
  const [dadosCalculoPeso, setDadosCalculoPeso] = useState<{ pesoBase: number, outrasUnidades: any[], payloadAtual: any } | null>(null)

  const abrirModalEditarUnidade = (und: any) => {
    setUnidadeEditando(und)
    setTipoUnidade(und.tipo || "produto")
    setLargura(und.largura?.toString() || "")
    setUnidadeLargura(und.largura_unidade || "mm")
    setComprimento(und.comprimento?.toString() || "")
    setUnidadeComprimento(und.comprimento_unidade || "mm")
    setAltura(und.altura?.toString() || "")
    setUnidadeAltura(und.altura_unidade || "mm")
    setPesoBruto(und.peso_bruto?.toString() || "")
    setEanGtin(und.ean || "")
    setModalEditarUnidadeAberto(true)
  }

  const confirmarCalculoPeso = (aceitou: boolean) => {
    if (!dadosCalculoPeso || !unidadeEditando) return;

    const unidadeAtualizada = { ...unidadeEditando, ...dadosCalculoPeso.payloadAtual };

    setProdutoSelecionado((prev: any) => {
      if (!prev) return prev;
      const novasUnidades = prev.unidades.map((u: any) => {
        // Atualiza a unidade que o usuário editou no modal
        if (u.id === unidadeEditando.id) {
          return unidadeAtualizada;
        }
        // Se aceitou, atualiza automaticamente o peso das outras
        if (aceitou && u.id !== unidadeEditando.id) {
          const novoPeso = dadosCalculoPeso.pesoBase * u.fator_conversao;
          return { ...u, peso_bruto: Number(novoPeso.toFixed(3)) };
        }
        return u;
      });
      return { ...prev, unidades: novasUnidades };
    });

    setUnidadeSelecionada(unidadeAtualizada);
    setModalConfirmarPesoAberto(false);
    setModalEditarUnidadeAberto(false);
  };

  const handleAplicarUnidade = () => {
    if (!unidadeEditando) return;

    if (eanGtin && !validarEAN(eanGtin)) {
      toast.error("O EAN/GTIN inserido é inválido. Verifique a digitação.");
      return;
    }

    const pesoAtual = pesoBruto ? Number(pesoBruto) : null;

    const payload = {
      tipo: tipoUnidade,
      largura: largura ? Number(largura) : null,
      largura_unidade: unidadeLargura,
      comprimento: comprimento ? Number(comprimento) : null,
      comprimento_unidade: unidadeComprimento,
      altura: altura ? Number(altura) : null,
      altura_unidade: unidadeAltura,
      peso_bruto: pesoAtual,
      ean: eanGtin || null
    };

    const outrasUnidades = produtoSelecionado?.unidades?.filter((u: any) => u.id !== unidadeEditando.id) || [];

    if (pesoAtual && outrasUnidades.length > 0 && pesoAtual !== unidadeEditando.peso_bruto) {
      const pesoBase = pesoAtual / unidadeEditando.fator_conversao;
      setDadosCalculoPeso({ pesoBase, outrasUnidades, payloadAtual: payload });
      setModalConfirmarPesoAberto(true);
      return;
    }

    // Aplica direto na tabela se não precisou calcular peso
    const unidadeAtualizada = { ...unidadeEditando, ...payload };

    setProdutoSelecionado((prev: any) => {
      if (!prev) return prev;
      const novasUnidades = prev.unidades.map((u: any) => {
        if (u.id === unidadeEditando.id) {
          return unidadeAtualizada;
        }
        return u;
      });
      return { ...prev, unidades: novasUnidades };
    });

    setUnidadeSelecionada(unidadeAtualizada);
    setModalEditarUnidadeAberto(false);
  };

  // Estados dos Parâmetros
  const [variavelConsumo, setVariavelConsumo] = useState("unidade")
  const [areaArmazenagem, setAreaArmazenagem] = useState("")
  const [tipoValidade, setTipoValidade] = useState("sem_validade")
  const [prazoValidade, setPrazoValidade] = useState("")
  const [vencimentoMinimo, setVencimentoMinimo] = useState("")
  const [controleLote, setControleLote] = useState("opcional")
  const [giroEstoque, setGiroEstoque] = useState("FEFO")
  const [bloquearVencido, setBloquearVencido] = useState(false)
  const [bloquearSemValidade, setBloquearSemValidade] = useState(false)
  const [bloquearSemLote, setBloquearSemLote] = useState(false)
  const [bloquearReprovado, setBloquearReprovado] = useState(false)

  const carregarProdutos = async (termo?: string) => {
    try {
      setCarregando(true)
      const dados = await produtoService.listar(termo)
      setProdutos(dados)
      if (termo !== undefined) setProdutoSelecionado(null)
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      toast.error("Erro ao carregar os produtos. Verifique a conexão com o servidor.")
    } finally {
      setCarregando(false)
    }
  }

  const carregarDependencias = async () => {
    try {
      const fams = await familiaService.listar()
      setFamilias(fams)
      const globais = await parametrosMestresService.obter()
      setParametrosGlobais(globais)
      const unds = await unidadeMedidaService.listar()
      setUnidadesMedida(unds)
    } catch (error) {
      console.error("Erro ao carregar dependências:", error)
    }
  }

  useEffect(() => {
    carregarProdutos()
    carregarDependencias()
  }, [])

  const sincronizarEAtualizar = async () => {
    setCarregando(true)
    try {
      const resultado = await produtoService.sincronizar()
      await carregarProdutos()

      if (resultado.inseridos > 0 || resultado.atualizados > 0) {
        toast.success(`Sincronização concluída! ${resultado.inseridos} novos, ${resultado.atualizados} alterados.`)
      } else {
        toast.success("Sincronização concluída! Nenhum produto novo ou alterado.")
      }
    } catch (error) {
      console.error("Erro na sincronização:", error)
      toast.error("Erro ao sincronizar com o ERP")
    } finally {
      setCarregando(false)
    }
  }

  // Função que resolve a cascata: Produto -> Família -> Global
  const resolverRegra = (campo: keyof Familia, fallbackGlobal: any, prod = produtoSelecionado) => {
    if (!prod || !prod.familia_id) return fallbackGlobal;
    const fam = familias.find(f => f.id === prod.familia_id);
    if (!fam) return fallbackGlobal;
    return (fam[campo] !== null && fam[campo] !== undefined) ? fam[campo] : fallbackGlobal;
  };

  const toggleLockVariavel = () => {
    const novo = !lockVariavel;
    setLockVariavel(novo);
    if (novo) setVariavelConsumo(resolverRegra('variavel_consumo', "unidade") || "unidade");
  };

  const toggleLockArea = () => {
    const novo = !lockArea;
    setLockArea(novo);
    if (novo) setAreaArmazenagem(resolverRegra('area_armazenagem_preferencial', "") || "");
  };

  const toggleLockValidade = () => {
    const novo = !lockValidade;
    setLockValidade(novo);
    if (novo) {
      const globalVal = parametrosGlobais?.validade_obrigatoria ? "obrigatoria" : "opcional";
      setTipoValidade(resolverRegra('tipo_validade', globalVal) || "sem_validade");
      setPrazoValidade(resolverRegra('prazo_validade', "")?.toString() || "");
      setVencimentoMinimo(resolverRegra('vencimento_minimo', "")?.toString() || "");
    }
  };

  const toggleLockLote = () => {
    const novo = !lockLote;
    setLockLote(novo);
    if (novo) setControleLote(resolverRegra('lote_obrigatorio', parametrosGlobais?.lote_obrigatorio) ? "obrigatorio" : "opcional");
  };

  const toggleLockGiro = () => {
    const novo = !lockGiro;
    setLockGiro(novo);
    if (novo) setGiroEstoque(resolverRegra('modelo_giro', parametrosGlobais?.modelo_giro || "FEFO"));
  };

  const toggleLockBloqueios = () => {
    const novo = !lockBloqueios;
    setLockBloqueios(novo);
    if (novo) {
      setBloquearVencido(resolverRegra('bloquear_vencido', parametrosGlobais?.bloquear_vencido ?? false));
      setBloquearSemValidade(resolverRegra('bloquear_sem_validade', parametrosGlobais?.bloquear_sem_validade ?? false));
      setBloquearSemLote(resolverRegra('bloquear_sem_lote', parametrosGlobais?.bloquear_sem_lote ?? false));
      setBloquearReprovado(resolverRegra('bloquear_reprovado', parametrosGlobais?.bloquear_reprovado ?? false));
    }
  };

  const abrirModalEditar = (prod: Produto) => {
    setProdutoSelecionado(prod);
    setAbaAtiva('cadastro');

    // Cadastro
    setFamiliaId(prod.familia_id || "");
    setStatusProduto(prod.status);
    setProdutoBloqueado(prod.bloqueado);
    setMotivoBloqueio(prod.motivo_bloqueio || "");
    setCodigoFornecedor(prod.codigo_fornecedor || "");

    // Variável de Consumo
    const herdaVariavel = prod.variavel_consumo === null || prod.variavel_consumo === undefined;
    setLockVariavel(herdaVariavel);
    setVariavelConsumo(herdaVariavel ? (resolverRegra('variavel_consumo', "unidade", prod)) : prod.variavel_consumo!);

    // Área Armazenagem
    const herdaArea = prod.area_armazenagem_preferencial === null || prod.area_armazenagem_preferencial === undefined;
    setLockArea(herdaArea);
    setAreaArmazenagem(herdaArea ? (resolverRegra('area_armazenagem_preferencial', "", prod) || "") : (prod.area_armazenagem_preferencial || ""));

    // Validade e Prazos
    const herdaValidade = prod.tipo_validade === null || prod.tipo_validade === undefined;
    setLockValidade(herdaValidade);

    if (!herdaValidade) {
        setTipoValidade(prod.tipo_validade || "sem_validade");
        setPrazoValidade(prod.prazo_validade?.toString() || "");
        setVencimentoMinimo(prod.vencimento_minimo?.toString() || "");
    } else {
        const globalVal = parametrosGlobais?.validade_obrigatoria ? "obrigatoria" : "opcional";
        setTipoValidade(resolverRegra('tipo_validade', globalVal, prod) || "sem_validade");
        setPrazoValidade(resolverRegra('prazo_validade', "", prod)?.toString() || "");
        setVencimentoMinimo(resolverRegra('vencimento_minimo', "", prod)?.toString() || "");
    }

    // Lote
    const herdaLote = prod.lote_obrigatorio === null || prod.lote_obrigatorio === undefined;
    setLockLote(herdaLote);
    setControleLote(herdaLote ? (resolverRegra('lote_obrigatorio', parametrosGlobais?.lote_obrigatorio, prod) ? "obrigatorio" : "opcional") : (prod.lote_obrigatorio ? "obrigatorio" : "opcional"));

    // Giro
    const herdaGiro = prod.modelo_giro === null || prod.modelo_giro === undefined;
    setLockGiro(herdaGiro);
    setGiroEstoque(herdaGiro ? resolverRegra('modelo_giro', parametrosGlobais?.modelo_giro || "FEFO", prod) : (prod.modelo_giro || "FEFO"));

    // Bloqueios
    const herdaBloqueios = prod.bloquear_vencido === null || prod.bloquear_vencido === undefined;
    setLockBloqueios(herdaBloqueios);
    if (!herdaBloqueios) {
        setBloquearVencido(prod.bloquear_vencido ?? false);
        setBloquearSemValidade(prod.bloquear_sem_validade ?? false);
        setBloquearSemLote(prod.bloquear_sem_lote ?? false);
        setBloquearReprovado(prod.bloquear_reprovado ?? false);
    } else {
        setBloquearVencido(resolverRegra('bloquear_vencido', parametrosGlobais?.bloquear_vencido ?? false, prod));
        setBloquearSemValidade(resolverRegra('bloquear_sem_validade', parametrosGlobais?.bloquear_sem_validade ?? false, prod));
        setBloquearSemLote(resolverRegra('bloquear_sem_lote', parametrosGlobais?.bloquear_sem_lote ?? false, prod));
        setBloquearReprovado(resolverRegra('bloquear_reprovado', parametrosGlobais?.bloquear_reprovado ?? false, prod));
    }

    setModalEditarAberto(true);
  };

  const handleSalvarParametros = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      setSalvando(true);

      // Ao enviar null, o Python no backend entende que deve apagar a exceção e forçar o banco a herdar
      const payload = {
        familia_id: familiaId === "" ? null : Number(familiaId),
        status: statusProduto,
        bloqueado: produtoBloqueado,
        motivo_bloqueio: produtoBloqueado ? motivoBloqueio : null,
        codigo_fornecedor: codigoFornecedor || null,
        variavel_consumo: lockVariavel ? null : variavelConsumo,
        area_armazenagem_preferencial: lockArea || !areaArmazenagem ? null : areaArmazenagem,
        tipo_validade: lockValidade ? null : tipoValidade,
        prazo_validade: lockValidade || tipoValidade === "sem_validade" || !prazoValidade ? null : Number(prazoValidade),
        vencimento_minimo: lockValidade || tipoValidade === "sem_validade" || !vencimentoMinimo ? null : Number(vencimentoMinimo),
        lote_obrigatorio: lockLote ? null : (controleLote === "obrigatorio"),
        modelo_giro: lockGiro ? null : giroEstoque,
        bloquear_vencido: lockBloqueios ? null : bloquearVencido,
        bloquear_sem_validade: lockBloqueios ? null : bloquearSemValidade,
        bloquear_sem_lote: lockBloqueios ? null : bloquearSemLote,
        bloquear_reprovado: lockBloqueios ? null : bloquearReprovado
      };

      await produtoService.editar(produtoSelecionado.id, payload);

      // Salva em lote todas as unidades que foram "aplicadas" na tabela
      if (produtoSelecionado.unidades) {
        for (const und of produtoSelecionado.unidades) {
          await produtoService.editarUnidade(und.id, {
            tipo: und.tipo,
            largura: und.largura,
            largura_unidade: und.largura_unidade,
            comprimento: und.comprimento,
            comprimento_unidade: und.comprimento_unidade,
            altura: und.altura,
            altura_unidade: und.altura_unidade,
            peso_bruto: und.peso_bruto,
            ean: und.ean
          });
        }
      }

      toast.success("Produto atualizado!");
      setModalEditarAberto(false);
      carregarProdutos();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar o produto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={(termo) => {
            setTermoBusca(termo);
            carregarProdutos(termo);
          }}
          acoes={[
            {
              label: "Editar",
              onClick: () => {
                if (!produtoSelecionado) {
                  toast.error("Selecione um produto na tabela.");
                  return;
                }
                abrirModalEditar(produtoSelecionado);
              }
            },
            {
              label: "Sincronizar",
              onClick: sincronizarEAtualizar
            }
          ]}
        />

        <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50 shadow-sm">
              <tr className="text-gray-700 text-sm">
                <th className="px-3 py-2 font-semibold border-b border-gray-200">SKU</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Descrição</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Referência</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {produtos.length === 0 && !carregando ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtos.map((prod) => (
                  <tr
                    key={prod.id}
                    onClick={() => setProdutoSelecionado(prod)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      produtoSelecionado?.id === prod.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 font-bold text-blue-900">{prod.sku}</td>
                    <td className="px-3 py-1.5">{prod.descricao}</td>
                    <td className="px-3 py-1.5">{prod.referencia || "-"}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        prod.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {prod.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      <Modal
        isOpen={modalEditarAberto && !!produtoSelecionado}
        zIndexClass="z-[1000]"
        fundoTransparente={modalMotivoAberto || modalEditarUnidadeAberto || modalConfirmarPesoAberto}
      >
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[95vh] overflow-y-auto">
            {/* Abas */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setAbaAtiva('cadastro')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'cadastro' ? 'border-[#1a63b6] text-[#1a63b6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Cadastro
              </button>
              <button
                onClick={() => setAbaAtiva('parametros')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'parametros' ? 'border-[#1a63b6] text-[#1a63b6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Parâmetros
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <form onSubmit={handleSalvarParametros} className="space-y-6">
              {abaAtiva === 'cadastro' && (
                <div className="space-y-5">
                  {/* Botões de Ação */}
                  <div className="flex space-x-3 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (produtoBloqueado) {
                          setProdutoBloqueado(false);
                          setMotivoBloqueio("");
                        } else {
                          setModalMotivoAberto(true);
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors flex-1 border ${produtoBloqueado ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {produtoBloqueado ? "Desbloquear" : "Bloquear"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusProduto(statusProduto === 'ativo' ? 'inativo' : 'ativo')}
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors flex-1 border ${statusProduto === 'inativo' ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {statusProduto === 'inativo' ? "Ativar" : "Inativar"}
                    </button>
                  </div>

                  {/* Identificação (Readonly) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                      <input type="text" value={produtoSelecionado.sku} disabled className="w-full border border-gray-200 bg-gray-100 p-2 rounded text-sm text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Referência</label>
                      <input type="text" value={produtoSelecionado.referencia || "-"} disabled className="w-full border border-gray-200 bg-gray-100 p-2 rounded text-sm text-gray-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={produtoSelecionado.descricao} disabled className="w-full border border-gray-200 bg-gray-100 p-2 rounded text-sm text-gray-500" />
                  </div>

                  {/* Dados Editáveis */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código do Fornecedor</label>
                      <input
                        type="text"
                        value={codigoFornecedor}
                        onChange={(e) => setCodigoFornecedor(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Família</label>
                      <select
                        value={familiaId || ""}
                        onChange={(e) => setFamiliaId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                      >
                        <option value="">Selecione...</option>
                        {familias.map(fam => (
                          <option key={fam.id} value={fam.id}>{fam.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabela de Unidades */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-gray-700">Unidades</h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (!unidadeSelecionada) {
                            toast.error("Selecione uma unidade na tabela para editar.");
                            return;
                          }
                          abrirModalEditarUnidade(unidadeSelecionada);
                        }}
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50 transition-colors text-xs font-medium"
                      >
                        Editar
                      </button>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-gray-700 text-xs">
                            <th className="px-3 py-2 font-semibold">ID</th>
                            <th className="px-3 py-2 font-semibold">Unidade</th>
                            <th className="px-3 py-2 font-semibold">Tipo</th>
                            <th className="px-3 py-2 font-semibold">Fator</th>
                            <th className="px-3 py-2 font-semibold">L</th>
                            <th className="px-3 py-2 font-semibold">C</th>
                            <th className="px-3 py-2 font-semibold">A</th>
                            <th className="px-3 py-2 font-semibold">Peso Bruto</th>
                            <th className="px-3 py-2 font-semibold">EAN/GTIN</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                          {!produtoSelecionado.unidades || produtoSelecionado.unidades.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                                Nenhuma unidade cadastrada.
                              </td>
                            </tr>
                          ) : (
                            produtoSelecionado.unidades.map((und, index) => (
                              <tr
                                key={und.id}
                                onClick={() => setUnidadeSelecionada(und)}
                                className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                                  unidadeSelecionada?.id === und.id ? "bg-blue-100" : ""
                                }`}
                              >
                                <td className="px-3 py-2 text-gray-500 font-medium">{index + 1}</td>
                                <td className="px-3 py-2 font-bold text-blue-800">
                                  {und.unidade_medida_relacao?.sigla || und.unidade_medida_id}
                                </td>
                                <td className="px-3 py-2 uppercase text-xs font-semibold">{und.tipo}</td>
                                <td className="px-3 py-2">{und.fator_conversao}</td>
                                <td className="px-3 py-2">{und.largura ? `${und.largura}${und.largura_unidade || 'mm'}` : '-'}</td>
                                <td className="px-3 py-2">{und.comprimento ? `${und.comprimento}${und.comprimento_unidade || 'mm'}` : '-'}</td>
                                <td className="px-3 py-2">{und.altura ? `${und.altura}${und.altura_unidade || 'mm'}` : '-'}</td>
                                <td className="px-3 py-2">{und.peso_bruto || '-'}</td>
                                <td className="px-3 py-2">{und.ean || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {abaAtiva === 'parametros' && (
                <div className="space-y-4">
                  {/* Bloco Variável Consumo e Área */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Variável de Consumo</label>
                        <button type="button" onClick={toggleLockVariavel} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                          {lockVariavel ? "🔒 Herdar" : "🔓 Exceção"}
                        </button>
                      </div>
                      <select
                        value={variavelConsumo}
                        onChange={(e) => setVariavelConsumo(e.target.value)}
                        disabled={lockVariavel}
                        className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockVariavel ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                      >
                        <option value="unidade">Unidade</option>
                        <option value="largura">Largura</option>
                        <option value="comprimento">Comprimento</option>
                        <option value="peso">Peso</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Área Preferencial</label>
                        <button type="button" onClick={toggleLockArea} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                          {lockArea ? "🔒 Herdar" : "🔓 Exceção"}
                        </button>
                      </div>
                      <select
                        value={areaArmazenagem}
                        onChange={(e) => setAreaArmazenagem(e.target.value)}
                        disabled={lockArea}
                        className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockArea ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                      >
                        <option value="">Selecione a área...</option>
                        <option value="1">Área 1 (Exemplo)</option>
                        <option value="2">Área 2 (Exemplo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bloco Validade */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Validade</label>
                        <button type="button" onClick={toggleLockValidade} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                          {lockValidade ? "🔒 Herdar" : "🔓 Exceção"}
                        </button>
                      </div>
                      <select
                        value={tipoValidade}
                        onChange={(e) => setTipoValidade(e.target.value)}
                        disabled={lockValidade}
                        className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockValidade ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                      >
                        <option value="sem_validade">Sem Validade</option>
                        <option value="opcional">Opcional</option>
                        <option value="obrigatoria">Obrigatória</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de validade (dias)</label>
                        <input
                          type="number"
                          value={prazoValidade}
                          onChange={(e) => setPrazoValidade(e.target.value)}
                          min="0"
                          className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockValidade || tipoValidade === "sem_validade" ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                          disabled={lockValidade || tipoValidade === "sem_validade"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento mínimo (dias)</label>
                        <input
                          type="number"
                          value={vencimentoMinimo}
                          onChange={(e) => setVencimentoMinimo(e.target.value)}
                          min="0"
                          className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockValidade || tipoValidade === "sem_validade" ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                          disabled={lockValidade || tipoValidade === "sem_validade"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco Lote e Giro */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Controle de Lote</label>
                        <button type="button" onClick={toggleLockLote} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                          {lockLote ? "🔒 Herdar" : "🔓 Exceção"}
                        </button>
                      </div>
                      <select
                        value={controleLote}
                        onChange={(e) => setControleLote(e.target.value)}
                        disabled={lockLote}
                        className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockLote ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                      >
                        <option value="opcional">Opcional</option>
                        <option value="obrigatorio">Obrigatório</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Giro de Estoque</label>
                        <button type="button" onClick={toggleLockGiro} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                          {lockGiro ? "🔒 Herdar" : "🔓 Exceção"}
                        </button>
                      </div>
                      <select
                        value={giroEstoque}
                        onChange={(e) => setGiroEstoque(e.target.value)}
                        disabled={lockGiro}
                        className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${lockGiro ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                      >
                        <option value="FEFO">FEFO</option>
                        <option value="FIFO">FIFO</option>
                        <option value="LIFO">LIFO</option>
                      </select>
                    </div>
                  </div>

                  {/* Bloco Bloqueios */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Bloqueios Automáticos</label>
                      <button type="button" onClick={toggleLockBloqueios} className="text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none">
                        {lockBloqueios ? "🔒 Herdar" : "🔓 Exceção"}
                      </button>
                    </div>
                    <div className={`grid grid-cols-2 gap-2 p-2 rounded ${lockBloqueios ? 'opacity-60 pointer-events-none bg-gray-100 border border-gray-200' : 'border border-blue-300 bg-white'}`}>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={bloquearVencido} onChange={(e) => setBloquearVencido(e.target.checked)} className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6]" />
                        <span className="text-sm text-gray-700">Produto vencido</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={bloquearSemValidade} onChange={(e) => setBloquearSemValidade(e.target.checked)} className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6]" />
                        <span className="text-sm text-gray-700">Sem validade</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={bloquearSemLote} onChange={(e) => setBloquearSemLote(e.target.checked)} className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6]" />
                        <span className="text-sm text-gray-700">Sem lote</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={bloquearReprovado} onChange={(e) => setBloquearReprovado(e.target.checked)} className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6]" />
                        <span className="text-sm text-gray-700">Reprovado qualidade</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={() => setModalEditarAberto(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" loading={salvando}>Salvar</Button>
              </div>
            </form>
          </div>
      </Modal>

      {/* Modal de Motivo de Bloqueio */}
      <Modal isOpen={modalMotivoAberto} zIndexClass="z-[1010]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Motivo do Bloqueio</h3>
            <textarea
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={() => { setProdutoBloqueado(false); setModalMotivoAberto(false); setMotivoBloqueio(""); }}>Cancelar</Button>
              <Button type="button" variant="danger" disabled={!motivoBloqueio.trim()} onClick={() => {
                  setProdutoBloqueado(true);
                  setModalMotivoAberto(false);
              }}>Confirmar Bloqueio</Button>
            </div>
          </div>
      </Modal>

      {/* Modal de Edição de Unidade */}
      <Modal
        isOpen={modalEditarUnidadeAberto}
        zIndexClass="z-[1010]"
        fundoTransparente={modalConfirmarPesoAberto}
      >
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Editar Unidade</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidade</label>
                <select
                  value={tipoUnidade}
                  onChange={(e) => setTipoUnidade(e.target.value)}
                  disabled={unidadeEditando?.tipo === 'base'}
                  className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${
                    unidadeEditando?.tipo === 'base' ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="base">Base</option>
                  <option value="produto">Produto</option>
                  <option value="recipiente">Recipiente</option>
                </select>
                {unidadeEditando?.tipo === 'base' && (
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largura</label>
                  <div className="flex">
                    <input type="number" value={largura} onChange={(e) => setLargura(e.target.value)} className="w-full border border-gray-300 p-2 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                    <select value={unidadeLargura} onChange={(e) => setUnidadeLargura(e.target.value)} className="border-t border-b border-r border-gray-300 bg-gray-50 p-2 rounded-r text-sm focus:outline-none">
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comprimento</label>
                  <div className="flex">
                    <input type="number" value={comprimento} onChange={(e) => setComprimento(e.target.value)} className="w-full border border-gray-300 p-2 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                    <select value={unidadeComprimento} onChange={(e) => setUnidadeComprimento(e.target.value)} className="border-t border-b border-r border-gray-300 bg-gray-50 p-2 rounded-r text-sm focus:outline-none">
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura</label>
                  <div className="flex">
                    <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} className="w-full border border-gray-300 p-2 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                    <select value={unidadeAltura} onChange={(e) => setUnidadeAltura(e.target.value)} className="border-t border-b border-r border-gray-300 bg-gray-50 p-2 rounded-r text-sm focus:outline-none">
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Bruto</label>
                  <input type="number" value={pesoBruto} onChange={(e) => setPesoBruto(e.target.value)} className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EAN/GTIN</label>
                <input type="text" value={eanGtin} onChange={(e) => setEanGtin(e.target.value)} className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="secondary" onClick={() => setModalEditarUnidadeAberto(false)}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleAplicarUnidade}>Aplicar</Button>
            </div>
          </div>
      </Modal>

      {/* Modal de Confirmação de Cálculo de Peso */}
      <Modal isOpen={modalConfirmarPesoAberto} zIndexClass="z-[1020]">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Atualizar pesos?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Deseja que o sistema calcule <strong>automaticamente</strong> o peso das outras embalagens?
            </p>
            <div className="flex justify-end space-x-3 mt-4">
              <Button type="button" variant="secondary" onClick={() => confirmarCalculoPeso(false)}>Não</Button>
              <Button type="button" variant="primary" onClick={() => confirmarCalculoPeso(true)}>Sim</Button>
            </div>
          </div>
      </Modal>
    </div>
  )
}