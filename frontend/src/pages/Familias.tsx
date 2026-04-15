import { useState, useEffect } from 'react'
import { usePermissao } from '../hooks/usePermissao'
import { toast } from 'react-hot-toast'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Tooltip } from '../components/Tooltip'
import { ActionToolbar } from '../components/ActionToolbar'
import { familiaService } from '../services/familiaService'
import { parametrosMestresService } from '../services/parametrosMestresService'
import type { Familia } from '../types/familia'

export default function Familias() {
  const { temPermissao } = usePermissao()
  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaSelecionada, setFamiliaSelecionada] = useState<Familia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novaDescricao, setNovaDescricao] = useState("")
  const [salvando, setSalvando] = useState(false)

  const [tipoValidade, setTipoValidade] = useState("sem_validade")
  const [prazoValidade, setPrazoValidade] = useState("")
  const [vencimentoMinimo, setVencimentoMinimo] = useState("")
  const [variavelConsumo, setVariavelConsumo] = useState("unidade")
  const [areaArmazenagem, setAreaArmazenagem] = useState("")
  const [controleLote, setControleLote] = useState("opcional")
  const [giroEstoque, setGiroEstoque] = useState("FEFO")
  const [bloquearVencido, setBloquearVencido] = useState(false)
  const [bloquearSemValidade, setBloquearSemValidade] = useState(false)
  const [bloquearSemLote, setBloquearSemLote] = useState(false)
  const [bloquearReprovado, setBloquearReprovado] = useState(false)
  const [fracionavelRecebimento, setFracionavelRecebimento] = useState(true)
  const [lockValidade, setLockValidade] = useState(true)
  const [lockLote, setLockLote] = useState(true)
  const [lockGiro, setLockGiro] = useState(true)
  const [lockBloqueios, setLockBloqueios] = useState(true)

  const [parametrosGlobais, setParametrosGlobais] = useState<any>(null)

  const carregarParametrosGlobais = async () => {
    try {
      const dados = await parametrosMestresService.obter()
      if (dados) {
        setParametrosGlobais(dados)
        setTipoValidade(dados.validade_obrigatoria ? "obrigatoria" : "opcional")
        setControleLote(dados.lote_obrigatorio ? "obrigatorio" : "opcional")
        setGiroEstoque(dados.modelo_giro || "FEFO")
        setBloquearVencido(dados.bloquear_vencido ?? false)
        setBloquearSemValidade(dados.bloquear_sem_validade ?? false)
        setBloquearSemLote(dados.bloquear_sem_lote ?? false)
        setBloquearReprovado(dados.bloquear_reprovado ?? false)
      }
    } catch (error) {
      console.error("Erro ao carregar parâmetros globais:", error)
    }
  }

  const resetarFormulario = () => {
    setModoEdicao(false);
    setNovoNome("");
    setNovaDescricao("");
    setPrazoValidade("");
    setVencimentoMinimo("");
    setVariavelConsumo("unidade");
    setAreaArmazenagem("");

    setLockValidade(true);
    setLockLote(true);
    setLockGiro(true);
    setLockBloqueios(true);

    if (parametrosGlobais) {
      setTipoValidade(parametrosGlobais.validade_obrigatoria ? "obrigatoria" : "opcional");
      setControleLote(parametrosGlobais.lote_obrigatorio ? "obrigatorio" : "opcional");
      setGiroEstoque(parametrosGlobais.modelo_giro || "FEFO");
      setBloquearVencido(parametrosGlobais.bloquear_vencido ?? false);
      setBloquearSemValidade(parametrosGlobais.bloquear_sem_validade ?? false);
      setBloquearSemLote(parametrosGlobais.bloquear_sem_lote ?? false);
      setBloquearReprovado(parametrosGlobais.bloquear_reprovado ?? false);
    } else {
      setTipoValidade("sem_validade");
      setControleLote("opcional");
      setGiroEstoque("FEFO");
      setBloquearVencido(false);
      setBloquearSemValidade(false);
      setBloquearSemLote(false);
      setBloquearReprovado(false);
      setFracionavelRecebimento(true);
    }
  }

  const toggleLockValidade = () => {
    const novo = !lockValidade;
    setLockValidade(novo);
    if (novo) {
      setTipoValidade(parametrosGlobais?.validade_obrigatoria ? "obrigatoria" : "opcional");
    }
  };

  const toggleLockLote = () => {
    const novo = !lockLote;
    setLockLote(novo);
    if (novo) {
      setControleLote(parametrosGlobais?.lote_obrigatorio ? "obrigatorio" : "opcional");
    }
  };

  const toggleLockGiro = () => {
    const novo = !lockGiro;
    setLockGiro(novo);
    if (novo) {
      setGiroEstoque(parametrosGlobais?.modelo_giro || "FEFO");
    }
  };

  const toggleLockBloqueios = () => {
    const novo = !lockBloqueios;
    setLockBloqueios(novo);
    if (novo) {
      setBloquearVencido(parametrosGlobais?.bloquear_vencido ?? false);
      setBloquearSemValidade(parametrosGlobais?.bloquear_sem_validade ?? false);
      setBloquearSemLote(parametrosGlobais?.bloquear_sem_lote ?? false);
      setBloquearReprovado(parametrosGlobais?.bloquear_reprovado ?? false);
    }
  };

  const abrirModalEditar = () => {
    if (!familiaSelecionada) {
      toast.error("Selecione uma família.");
      return;
    }

    setModoEdicao(true);
    setNovoNome(familiaSelecionada.nome);
    setNovaDescricao(familiaSelecionada.descricao || "");
    setVariavelConsumo(familiaSelecionada.variavel_consumo);
    setAreaArmazenagem(familiaSelecionada.area_armazenagem_preferencial || "");
    setFracionavelRecebimento(familiaSelecionada.fracionavel_recebimento ?? true);

    const herdaValidade = familiaSelecionada.tipo_validade === null;
    setLockValidade(herdaValidade);

    // Os prazos são carregados independentemente de a família herdar ou não a regra global
    setPrazoValidade(familiaSelecionada.prazo_validade?.toString() || "");
    setVencimentoMinimo(familiaSelecionada.vencimento_minimo?.toString() || "");

    if (!herdaValidade) {
      setTipoValidade(familiaSelecionada.tipo_validade || "sem_validade");
    } else {
      setTipoValidade(parametrosGlobais?.validade_obrigatoria ? "obrigatoria" : "opcional");
    }

    const herdaLote = familiaSelecionada.lote_obrigatorio === null;
    setLockLote(herdaLote);
    setControleLote(herdaLote ? (parametrosGlobais?.lote_obrigatorio ? "obrigatorio" : "opcional") : (familiaSelecionada.lote_obrigatorio ? "obrigatorio" : "opcional"));

    const herdaGiro = familiaSelecionada.modelo_giro === null;
    setLockGiro(herdaGiro);
    setGiroEstoque(herdaGiro ? (parametrosGlobais?.modelo_giro || "FEFO") : (familiaSelecionada.modelo_giro || "FEFO"));

    const herdaBloqueios = familiaSelecionada.bloquear_vencido === null;
    setLockBloqueios(herdaBloqueios);
    if (!herdaBloqueios) {
      setBloquearVencido(familiaSelecionada.bloquear_vencido ?? false);
      setBloquearSemValidade(familiaSelecionada.bloquear_sem_validade ?? false);
      setBloquearSemLote(familiaSelecionada.bloquear_sem_lote ?? false);
      setBloquearReprovado(familiaSelecionada.bloquear_reprovado ?? false);
    } else {
      setBloquearVencido(parametrosGlobais?.bloquear_vencido ?? false);
      setBloquearSemValidade(parametrosGlobais?.bloquear_sem_validade ?? false);
      setBloquearSemLote(parametrosGlobais?.bloquear_sem_lote ?? false);
      setBloquearReprovado(parametrosGlobais?.bloquear_reprovado ?? false);
    }

    setModalCriarAberto(true);
  }

  const carregarFamilias = async (termo?: string) => {
    try {
      setCarregando(true)
      const dados = await familiaService.listar(termo)
      setFamilias(dados)
      if (termo !== undefined) setFamiliaSelecionada(null)
    } catch (error) {
      console.error("Erro ao carregar famílias:", error)
      toast.error("Erro ao carregar as famílias.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarFamilias()
    carregarParametrosGlobais()
  }, [])

  const handleExcluir = async () => {
    if (!familiaSelecionada) return;
    if (!confirm(`Tem certeza que deseja excluir a família ${familiaSelecionada.nome}?`)) return;

    try {
      await familiaService.excluir(familiaSelecionada.id);
      toast.success("Família excluída com sucesso!");
      carregarFamilias();
    } catch (error) {
      toast.error("Erro ao excluir família. Verifique se existem produtos vinculados.");
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    try {
      setSalvando(true);
      const payload = {
        nome: novoNome,
        descricao: novaDescricao || undefined,
        variavel_consumo: variavelConsumo,
        tipo_validade: lockValidade ? undefined : tipoValidade,
        prazo_validade: tipoValidade === "sem_validade" || !prazoValidade ? undefined : Number(prazoValidade),
        vencimento_minimo: tipoValidade === "sem_validade" || !vencimentoMinimo ? undefined : Number(vencimentoMinimo),
        area_armazenagem_preferencial: areaArmazenagem || undefined,
        lote_obrigatorio: lockLote ? undefined : (controleLote === "obrigatorio"),
        modelo_giro: lockGiro ? undefined : giroEstoque,
        bloquear_vencido: lockBloqueios ? undefined : bloquearVencido,
        bloquear_sem_lote: lockBloqueios ? undefined : bloquearSemLote,
        bloquear_reprovado: lockBloqueios ? undefined : bloquearReprovado,
        fracionavel_recebimento: fracionavelRecebimento
      };

      if (modoEdicao && familiaSelecionada) {
        await familiaService.atualizar(familiaSelecionada.id, payload);
        toast.success("Família atualizada com sucesso!");
      } else {
        await familiaService.criar(payload);
        toast.success("Família criada com sucesso!");
      }

      setModalCriarAberto(false);
      resetarFormulario();
      carregarFamilias();
    } catch (error) {
      console.error("Erro ao salvar família:", error);
      toast.error("Erro ao salvar família. Verifique o console.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={(termo) => {
            setTermoBusca(termo);
            carregarFamilias(termo);
          }}
          acoes={[
            ...(temPermissao('CADASTROS.PRODUTOS') ? [
              {
                label: "Criar",
                onClick: () => {
                  resetarFormulario();
                  setModalCriarAberto(true);
                }
              },
              { label: "Editar", onClick: abrirModalEditar },
              {
                label: "Excluir",
                isDanger: true,
                onClick: () => {
                  if (!familiaSelecionada) {
                    toast.error("Selecione uma família.");
                    return;
                  }
                  handleExcluir();
                }
              }
            ] : [])
          ]}
        />

        <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50 shadow-sm">
              <tr className="text-gray-700 text-sm">
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Nome</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {familias.length === 0 && !carregando ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-gray-500">Nenhuma família encontrada.</td>
                </tr>
              ) : (
                familias.map((fam) => (
                  <tr
                    key={fam.id}
                    onClick={() => setFamiliaSelecionada(fam)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${familiaSelecionada?.id === fam.id ? "bg-blue-100" : ""
                      }`}
                  >
                    <td className="px-3 py-1.5 font-bold text-blue-900">{fam.nome}</td>
                    <td className="px-3 py-1.5">{fam.descricao || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalCriarAberto}>
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[95vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{modoEdicao ? 'Editar Família' : 'Criar Família'}</h2>
          <form onSubmit={handleSalvar} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                autoFocus
              />
              <Input
                label="Descrição"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
              />
            </div>

            <div className="border border-gray-200 rounded-md bg-gray-50 p-4 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Parâmetros</h3>

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de validade (dias)</label>
                  <input
                    type="number"
                    value={prazoValidade}
                    onChange={(e) => setPrazoValidade(e.target.value)}
                    min="0"
                    className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${tipoValidade === "sem_validade" ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                    disabled={tipoValidade === "sem_validade"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento mínimo (dias)</label>
                  <input
                    type="number"
                    value={vencimentoMinimo}
                    onChange={(e) => setVencimentoMinimo(e.target.value)}
                    min="0"
                    className={`w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] ${tipoValidade === "sem_validade" ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-blue-300'}`}
                    disabled={tipoValidade === "sem_validade"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variável de Consumo</label>
                  <select
                    value={variavelConsumo}
                    onChange={(e) => setVariavelConsumo(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  >
                    <option value="unidade">Unidade</option>
                    <option value="largura">Largura</option>
                    <option value="comprimento">Comprimento</option>
                    <option value="peso">Peso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área de Armazenagem Preferencial</label>
                  <select
                    value={areaArmazenagem}
                    onChange={(e) => setAreaArmazenagem(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  >
                    <option value="">Selecione a área...</option>
                    <option value="1">Área 1 (Exemplo)</option>
                    <option value="2">Área 2 (Exemplo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
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
                <div>
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

              <div>
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

              <div className="bg-gray-50 border-t border-gray-200 mt-4 pt-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#1a63b6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Recebimento
                </h3>
                <div className="p-2 border border-blue-200 bg-blue-50/30 rounded-lg">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fracionavelRecebimento}
                      onChange={(e) => setFracionavelRecebimento(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6]"
                    />
                    <span className="text-sm text-gray-800 font-bold">Divisível</span>
                    <Tooltip text="Se ativado, permite gerar UAs menores a partir de sobras." />
                  </label>
                </div>
              </div>

            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={() => {
                  setModalCriarAberto(false);
                  resetarFormulario();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={salvando}>
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  )
}