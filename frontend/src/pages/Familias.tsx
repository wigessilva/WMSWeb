import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { familiaService } from '../services/familiaService'
import type { Familia } from '../types/familia'

export default function Familias() {
  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaSelecionada, setFamiliaSelecionada] = useState<Familia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")
  const [dropdownAberto, setDropdownAberto] = useState(false)

  const [modalCriarAberto, setModalCriarAberto] = useState(false)
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

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    try {
      setSalvando(true);
      await familiaService.criar({
        nome: novoNome,
        descricao: novaDescricao || undefined,
        tipo_validade: tipoValidade,
        prazo_validade: prazoValidade ? Number(prazoValidade) : undefined,
        vencimento_minimo: vencimentoMinimo ? Number(vencimentoMinimo) : undefined,
        variavel_consumo: variavelConsumo,
        area_armazenagem_preferencial: areaArmazenagem || undefined,
        controle_lote: controleLote,
        giro_estoque: giroEstoque,
        bloquear_vencido: bloquearVencido,
        bloquear_sem_validade: bloquearSemValidade,
        bloquear_sem_lote: bloquearSemLote,
        bloquear_reprovado: bloquearReprovado
      });
      toast.success("Família criada com sucesso!");
      setModalCriarAberto(false);
      setNovoNome("");
      setNovaDescricao("");
      setTipoValidade("sem_validade");
      setPrazoValidade("");
      setVencimentoMinimo("");
      setVariavelConsumo("unidade");
      setAreaArmazenagem("");
      setControleLote("opcional");
      setGiroEstoque("FEFO");
      setBloquearVencido(false);
      setBloquearSemValidade(false);
      setBloquearSemLote(false);
      setBloquearReprovado(false);
      carregarFamilias();
    } catch (error) {
      toast.error("Erro ao criar família.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex w-1/6 min-w-[125px]">
            <input
              type="text"
              placeholder="Buscar"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                carregarFamilias(e.target.value);
              }}
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className="bg-[#1a63b6] text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm"
            >
              Ações <span className="ml-2 text-xs">▼</span>
            </button>

            {dropdownAberto && (
              <div className="absolute top-10 right-0 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden">
                <button onClick={() => { setDropdownAberto(false); setModalCriarAberto(true); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Criar</button>
                <button
                  onClick={() => {
                    if (!familiaSelecionada) { toast.error("Selecione uma família."); return; }
                    setDropdownAberto(false);
                    toast.info("Funcionalidade Editar em breve");
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (!familiaSelecionada) { toast.error("Selecione uma família."); return; }
                    setDropdownAberto(false);
                    handleExcluir();
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

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
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      familiaSelecionada?.id === fam.id ? "bg-blue-100" : ""
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

      {modalCriarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Criar Família</h2>
            <form onSubmit={handleCriar} className="space-y-6">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-md bg-gray-50 p-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Parâmetros</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                    <select
                      value={tipoValidade}
                      onChange={(e) => setTipoValidade(e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
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
                      className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
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
                      className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Controle de Lote</label>
                    <select
                      value={controleLote}
                      onChange={(e) => setControleLote(e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                    >
                      <option value="opcional">Opcional</option>
                      <option value="obrigatorio">Obrigatório</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giro de Estoque</label>
                    <select
                      value={giroEstoque}
                      onChange={(e) => setGiroEstoque(e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                    >
                      <option value="FEFO">FEFO</option>
                      <option value="FIFO">FIFO</option>
                      <option value="LIFO">LIFO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bloqueios Automáticos</label>
                  <div className="grid grid-cols-2 gap-2">
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalCriarAberto(false);
                    setNovoNome("");
                    setNovaDescricao("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] rounded hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}