import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { parametrosMestresService } from '../services/parametrosMestresService'
import { produtoService } from '../services/produtoService'
import { familiaService } from '../services/familiaService'
import type { Produto } from '../types/produto'
import type { Familia } from '../types/familia'

export default function ParametrosMestres() {
  const [idParametros, setIdParametros] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [validadeObrigatoria, setValidadeObrigatoria] = useState("opcional")
  const [controleLote, setControleLote] = useState("opcional")
  const [modeloGiro, setModeloGiro] = useState("FEFO")

  const [bloquearVencido, setBloquearVencido] = useState(true)
  const [bloquearSemValidade, setBloquearSemValidade] = useState(false)
  const [bloquearSemLote, setBloquearSemLote] = useState(false)
  const [bloquearReprovado, setBloquearReprovado] = useState(true)

  const [modalExcecoesAberto, setModalExcecoesAberto] = useState(false)
  const [abaExcecao, setAbaExcecao] = useState<'validade' | 'lote' | 'bloqueios' | 'giro' | 'todas'>('todas')
  const [verTipoExcecao, setVerTipoExcecao] = useState<'produtos' | 'familias'>('produtos')
  const [resetarExcecoesConfirm, setResetarExcecoesConfirm] = useState(false)

  const [produtosExcecao, setProdutosExcecao] = useState<Produto[]>([])
  const [familiasExcecao, setFamiliasExcecao] = useState<Familia[]>([])
  const [carregandoExcecoes, setCarregandoExcecoes] = useState(false)

  const carregarParametros = async () => {
    try {
      setCarregando(true)
      const dados = await parametrosMestresService.obter()
      if (dados) {
        setIdParametros(dados.id)
        setValidadeObrigatoria(dados.validade_obrigatoria ? "obrigatoria" : "opcional")
        setControleLote(dados.lote_obrigatorio ? "obrigatorio" : "opcional")
        setModeloGiro(dados.modelo_giro || "FEFO")
        setBloquearVencido(dados.bloquear_vencido ?? true)
        setBloquearReprovado(dados.bloquear_reprovado ?? true)
        setBloquearSemValidade(dados.bloquear_sem_validade ?? false)
        setBloquearSemLote(dados.bloquear_sem_lote ?? false)
      }
    } catch (error) {
      console.error("Erro ao carregar parâmetros:", error)
      toast.error("Erro ao carregar os parâmetros mestres.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarParametros()
  }, [])

  const carregarExcecoes = async () => {
    try {
      setCarregandoExcecoes(true)
      const prods = await produtoService.listar()
      const fams = await familiaService.listar()
      setProdutosExcecao(prods)
      setFamiliasExcecao(fams)
    } catch (error) {
      console.error("Erro ao carregar exceções:", error)
      toast.error("Erro ao carregar os dados de exceção.")
    } finally {
      setCarregandoExcecoes(false)
    }
  }

  useEffect(() => {
    if (modalExcecoesAberto && produtosExcecao.length === 0) {
      carregarExcecoes()
    }
  }, [modalExcecoesAberto])

  const getFamiliaNome = (id: number | null) => {
    if (!id) return "-";
    const fam = familiasExcecao.find(f => f.id === id);
    return fam ? fam.nome : "-";
  }

  const formatarValidade = (tipo: string | null | undefined) => {
    if (!tipo) return "-";
    if (tipo === 'sem_validade') return "Sem Validade";
    if (tipo === 'opcional') return "Opcional";
    if (tipo === 'obrigatoria') return "Obrigatória";
    return tipo;
  }

  const formatarLote = (val: boolean | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return val ? "Obrigatório" : "Opcional";
  }

  const formatarBool = (val: boolean | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return val ? "Sim" : "Não";
  }

  const renderTabelaExcecoes = () => {
    if (verTipoExcecao === 'produtos') {
      let filtrados: Produto[] = [];
      if (abaExcecao === 'validade') filtrados = produtosExcecao.filter(p => p.tipo_validade !== null);
      if (abaExcecao === 'lote') filtrados = produtosExcecao.filter(p => p.lote_obrigatorio !== null);
      if (abaExcecao === 'giro') filtrados = produtosExcecao.filter(p => p.modelo_giro !== null);
      if (abaExcecao === 'bloqueios') filtrados = produtosExcecao.filter(p => p.bloquear_vencido !== null);
      if (abaExcecao === 'todas') filtrados = produtosExcecao.filter(p => p.tipo_validade !== null || p.lote_obrigatorio !== null || p.modelo_giro !== null || p.bloquear_vencido !== null);

      return (
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-white shadow-sm border-b border-gray-200">
            <tr className="text-gray-700 text-sm">
              <th className="px-4 py-2 font-semibold">SKU</th>
              <th className="px-4 py-2 font-semibold">Descrição</th>
              <th className="px-4 py-2 font-semibold">Família</th>
              {abaExcecao === 'validade' && <th className="px-4 py-2 font-semibold">Validade</th>}
              {abaExcecao === 'lote' && <th className="px-4 py-2 font-semibold">Lote</th>}
              {abaExcecao === 'giro' && <th className="px-4 py-2 font-semibold">Modelo de Giro</th>}
              {abaExcecao === 'bloqueios' && (
                <>
                  <th className="px-4 py-2 font-semibold">Vencimento</th>
                  <th className="px-4 py-2 font-semibold">Sem Validade</th>
                  <th className="px-4 py-2 font-semibold">Sem Lote</th>
                  <th className="px-4 py-2 font-semibold">Rep. Qualidade</th>
                </>
              )}
              {abaExcecao === 'todas' && (
                <>
                  <th className="px-4 py-2 font-semibold">Validade</th>
                  <th className="px-4 py-2 font-semibold">Lote</th>
                  <th className="px-4 py-2 font-semibold">Giro</th>
                  <th className="px-4 py-2 font-semibold">B. Vencido</th>
                  <th className="px-4 py-2 font-semibold">B. Sem Validade</th>
                  <th className="px-4 py-2 font-semibold">B. Sem Lote</th>
                  <th className="px-4 py-2 font-semibold">B. Rep. Qual</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {filtrados.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500 italic">Nenhuma exceção nesta categoria.</td></tr>
            ) : (
              filtrados.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 font-medium">{p.sku}</td>
                  <td className="px-4 py-2">{p.descricao}</td>
                  <td className="px-4 py-2">{getFamiliaNome(p.familia_id)}</td>
                  {abaExcecao === 'validade' && <td className="px-4 py-2">{formatarValidade(p.tipo_validade)}</td>}
                  {abaExcecao === 'lote' && <td className="px-4 py-2">{formatarLote(p.lote_obrigatorio)}</td>}
                  {abaExcecao === 'giro' && <td className="px-4 py-2">{p.modelo_giro || "-"}</td>}
                  {abaExcecao === 'bloqueios' && (
                    <>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_vencido)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_sem_validade)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_sem_lote)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_reprovado)}</td>
                    </>
                  )}
                  {abaExcecao === 'todas' && (
                    <>
                      <td className="px-4 py-2">{formatarValidade(p.tipo_validade)}</td>
                      <td className="px-4 py-2">{formatarLote(p.lote_obrigatorio)}</td>
                      <td className="px-4 py-2">{p.modelo_giro || "-"}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_vencido)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_sem_validade)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_sem_lote)}</td>
                      <td className="px-4 py-2">{formatarBool(p.bloquear_reprovado)}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    } else {
      let filtrados: Familia[] = [];
      if (abaExcecao === 'validade') filtrados = familiasExcecao.filter(f => f.tipo_validade !== null);
      if (abaExcecao === 'lote') filtrados = familiasExcecao.filter(f => f.lote_obrigatorio !== null);
      if (abaExcecao === 'giro') filtrados = familiasExcecao.filter(f => f.modelo_giro !== null);
      if (abaExcecao === 'bloqueios') filtrados = familiasExcecao.filter(f => f.bloquear_vencido !== null);
      if (abaExcecao === 'todas') filtrados = familiasExcecao.filter(f => f.tipo_validade !== null || f.lote_obrigatorio !== null || f.modelo_giro !== null || f.bloquear_vencido !== null);

      return (
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-white shadow-sm border-b border-gray-200">
            <tr className="text-gray-700 text-sm">
              <th className="px-4 py-2 font-semibold">Família</th>
              {abaExcecao === 'validade' && <th className="px-4 py-2 font-semibold">Validade</th>}
              {abaExcecao === 'lote' && <th className="px-4 py-2 font-semibold">Lote</th>}
              {abaExcecao === 'giro' && <th className="px-4 py-2 font-semibold">Modelo de Giro</th>}
              {abaExcecao === 'bloqueios' && (
                <>
                  <th className="px-4 py-2 font-semibold">Vencimento</th>
                  <th className="px-4 py-2 font-semibold">Sem Validade</th>
                  <th className="px-4 py-2 font-semibold">Sem Lote</th>
                  <th className="px-4 py-2 font-semibold">Rep. Qualidade</th>
                </>
              )}
              {abaExcecao === 'todas' && (
                <>
                  <th className="px-4 py-2 font-semibold">Validade</th>
                  <th className="px-4 py-2 font-semibold">Lote</th>
                  <th className="px-4 py-2 font-semibold">Giro</th>
                  <th className="px-4 py-2 font-semibold">B. Vencido</th>
                  <th className="px-4 py-2 font-semibold">B. Sem Validade</th>
                  <th className="px-4 py-2 font-semibold">B. Sem Lote</th>
                  <th className="px-4 py-2 font-semibold">B. Rep. Qual</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {filtrados.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500 italic">Nenhuma exceção nesta categoria.</td></tr>
            ) : (
              filtrados.map(f => (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 font-medium">{f.nome}</td>
                  {abaExcecao === 'validade' && <td className="px-4 py-2">{formatarValidade(f.tipo_validade)}</td>}
                  {abaExcecao === 'lote' && <td className="px-4 py-2">{formatarLote(f.lote_obrigatorio)}</td>}
                  {abaExcecao === 'giro' && <td className="px-4 py-2">{f.modelo_giro || "-"}</td>}
                  {abaExcecao === 'bloqueios' && (
                    <>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_vencido)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_sem_validade)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_sem_lote)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_reprovado)}</td>
                    </>
                  )}
                  {abaExcecao === 'todas' && (
                    <>
                      <td className="px-4 py-2">{formatarValidade(f.tipo_validade)}</td>
                      <td className="px-4 py-2">{formatarLote(f.lote_obrigatorio)}</td>
                      <td className="px-4 py-2">{f.modelo_giro || "-"}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_vencido)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_sem_validade)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_sem_lote)}</td>
                      <td className="px-4 py-2">{formatarBool(f.bloquear_reprovado)}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idParametros) {
      toast.error("Nenhum parâmetro carregado para atualizar.")
      return
    }

    try {
      setSalvando(true)
      await parametrosMestresService.atualizar(idParametros, {
        validade_obrigatoria: validadeObrigatoria === "obrigatoria",
        lote_obrigatorio: controleLote === "obrigatorio",
        modelo_giro: modeloGiro,
        bloquear_vencido: bloquearVencido,
        bloquear_reprovado: bloquearReprovado,
        bloquear_sem_validade: bloquearSemValidade,
        bloquear_sem_lote: bloquearSemLote
      })
      toast.success("Parâmetros mestres atualizados com sucesso!")
    } catch (error) {
      toast.error("Erro ao salvar os parâmetros mestres.")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div className="p-6 text-gray-500">Carregando parâmetros...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Parâmetros Mestres</h1>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-[#1a63b6] text-white px-6 py-2 rounded hover:bg-blue-800 transition-colors font-medium shadow-sm disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-5">
          Estoque
        </h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
              <select
                value={validadeObrigatoria}
                onChange={(e) => setValidadeObrigatoria(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
              >
                <option value="opcional">Opcional</option>
                <option value="obrigatoria">Obrigatória</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Controle de Lote</label>
              <select
                value={controleLote}
                onChange={(e) => setControleLote(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
              >
                <option value="opcional">Opcional</option>
                <option value="obrigatorio">Obrigatório</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Giro</label>
              <select
                value={modeloGiro}
                onChange={(e) => setModeloGiro(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
              >
                <option value="FEFO">FEFO</option>
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Bloqueios Automáticos</label>
            <div className="grid grid-cols-1 gap-3 bg-gray-50 p-4 border border-gray-200 rounded-md">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={bloquearVencido}
                  onChange={(e) => setBloquearVencido(e.target.checked)}
                  className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6] w-4 h-4"
                />
                <span className="text-sm text-gray-700">Produto vencido</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={bloquearSemValidade}
                  onChange={(e) => setBloquearSemValidade(e.target.checked)}
                  className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6] w-4 h-4"
                />
                <span className="text-sm text-gray-700">Sem validade</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={bloquearSemLote}
                  onChange={(e) => setBloquearSemLote(e.target.checked)}
                  className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6] w-4 h-4"
                />
                <span className="text-sm text-gray-700">Sem lote</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={bloquearReprovado}
                  onChange={(e) => setBloquearReprovado(e.target.checked)}
                  className="rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6] w-4 h-4"
                />
                <span className="text-sm text-gray-700">Reprovado qualidade</span>
              </label>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações e Exceções */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <button
              type="button"
              onClick={() => setModalExcecoesAberto(true)}
              className="text-[#1a63b6] hover:text-blue-800 font-medium text-sm transition-colors"
            >
              Ver Exceções
            </button>

            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={resetarExcecoesConfirm}
                onChange={(e) => setResetarExcecoesConfirm(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="text-sm text-gray-600 group-hover:text-red-600 transition-colors">
                Resetar todas as exceções ao salvar
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Modal de Exceções */}
      {modalExcecoesAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl shadow-xl max-h-[95vh] flex flex-col">

            {/* Fechar */}
            <div className="flex justify-end mb-2">
              <button onClick={() => setModalExcecoesAberto(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Abas no Padrão do Sistema */}
            <div className="flex border-b border-gray-200 mb-4">
              {(['validade', 'lote', 'bloqueios', 'giro', 'todas'] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaExcecao(aba)}
                  className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                    abaExcecao === aba
                    ? 'border-[#1a63b6] text-[#1a63b6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {aba}
                </button>
              ))}
            </div>

            {/* Alternador de Tipo Embaixo das Abas */}
            <div className="flex mb-4">
              <button
                type="button"
                onClick={() => setVerTipoExcecao(verTipoExcecao === 'produtos' ? 'familias' : 'produtos')}
                className="px-4 py-2 text-sm font-medium text-[#1a63b6] bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                {verTipoExcecao === 'produtos' ? 'Famílias >' : '< Produtos'}
              </button>
            </div>

            {/* Área da Tabela */}
            <div className="flex-1 overflow-auto border border-gray-200 rounded">
              {carregandoExcecoes ? (
                <div className="h-64 flex items-center justify-center bg-gray-50">
                  <p className="text-gray-500">Carregando exceções...</p>
                </div>
              ) : (
                renderTabelaExcecoes()
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setModalExcecoesAberto(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}