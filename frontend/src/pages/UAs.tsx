import { useState, useEffect } from 'react'
import { uaService } from '../services/uaService'
import { ActionToolbar } from '../components/ActionToolbar'
import { Modal } from '../components/Modal'
import type { UA } from '../types/ua'
import { toast } from 'react-hot-toast'

export default function UAs() {
  const [uas, setUas] = useState<UA[]>([])
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

  // Controle do Modal de Geração
  const [isModalGerarOpen, setIsModalGerarOpen] = useState(false)
  const [quantidadeGerar, setQuantidadeGerar] = useState<number | "">("")
  const [gerando, setGerando] = useState(false)

  // Pega a filial do utilizador logado
  const usuario = JSON.parse(localStorage.getItem('wms_sessao_usuario') || '{}')
  const filialId = usuario.filiais?.[0]?.id || 1

  const carregarUAs = async () => {
    setCarregando(true)
    try {
      const dados = await uaService.listar()
      setUas(dados)
    } catch (error) {
      console.error("Erro ao carregar UAs:", error)
      toast.error("Erro ao carregar as UAs. Verifique a conexão com o servidor")
    } finally {
      setCarregando(false)
    }
  }

  const handleGerarUAs = async () => {
    const qtdParaGerar = Number(quantidadeGerar) || 0
    if (qtdParaGerar <= 0) {
      toast.error("Informe uma quantidade válida")
      return
    }

    setGerando(true)
    try {
      await uaService.criarEmLote(qtdParaGerar, filialId)
      toast.success(`${qtdParaGerar} UAs geradas com sucesso!`)
      setIsModalGerarOpen(false)
      carregarUAs() // Atualiza a lista para mostrar as novas UAs
    } catch (error) {
      console.error("Erro ao gerar UAs:", error)
      toast.error("Falha ao gerar UAs em lote")
    } finally {
      setGerando(false)
    }
  }

  useEffect(() => {
    carregarUAs()
  }, [])

  // Filtragem local básica
  const uasFiltradas = uas.filter(ua =>
    ua.ua.toLowerCase().includes(termoBusca.toLowerCase()) ||
    (ua.sku?.toLowerCase() || "").includes(termoBusca.toLowerCase()) ||
    (ua.descricao?.toLowerCase() || "").includes(termoBusca.toLowerCase()) ||
    ua.status.toLowerCase().includes(termoBusca.toLowerCase()) ||
    ua.estado.toLowerCase().includes(termoBusca.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-wms-sidebar">Gestão de UAs</h2>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={(termo) => setTermoBusca(termo)}
          acoes={[
            { label: "Atualizar", onClick: carregarUAs },
            {
              label: "Gerar",
              onClick: () => setIsModalGerarOpen(true),
            },
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded mt-4">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50 shadow-sm">
              <tr className="text-gray-700 text-sm">
                <th className="px-3 py-2 font-semibold border-b border-gray-200">UA</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">SKU</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Descrição</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Qtd</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Val</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Lote</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Endereço</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Dimensões</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Estado</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Observações</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {carregando ? (
                <tr>
                  <td colSpan={13} className="px-3 py-10 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wms-sidebar mb-2"></div>
                      <span>Carregando UAs...</span>
                    </div>
                  </td>
                </tr>
              ) : uasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-4 text-center text-gray-500">
                    Nenhuma UA encontrada.
                  </td>
                </tr>
              ) : (
                uasFiltradas.map((ua) => (
                  <tr
                    key={ua.id}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold text-blue-900">{ua.ua}</td>
                    <td className="px-3 py-2 font-medium text-gray-700">{ua.sku || "-"}</td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-xs" title={ua.descricao || ""}>{ua.descricao || "-"}</td>
                    <td className="px-3 py-2 text-center font-semibold text-blue-600">
                      {ua.quantidade || "0"}
                    </td>
                    <td className="px-3 py-2">
                      {ua.data_validade ? new Date(ua.data_validade).toLocaleDateString('pt-BR') : "-"}
                    </td>
                    <td className="px-3 py-2">{ua.lote || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                        {ua.endereco_id ? `ID: ${ua.endereco_id}` : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {ua.largura || 0}x{ua.comprimento || 0}x{ua.altura || 0}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ua.estado === "Bom" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                        {ua.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                        {ua.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 truncate max-w-xs" title={ua.observacoes || ""}>
                      {ua.observacoes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GERAÇÃO EM LOTE */}
      <Modal isOpen={isModalGerarOpen}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="flex items-center space-x-3 mb-4 text-blue-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800">Gerar</h3>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Informe a quantidade de etiquetas de UA virgens que deseja gerar para a filial <strong>{usuario.filiais?.[0]?.nome || "Padrão"}</strong>.
          </p>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Quantidade de UAs
            </label>
            <input
              type="number"
              min="1"
              value={quantidadeGerar}
              onChange={(e) => {
                const val = e.target.value
                setQuantidadeGerar(val === "" ? "" : parseInt(val) || 0)
              }}
              placeholder="0"
              className="w-full border-2 border-gray-200 p-3 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !gerando && quantidadeGerar && Number(quantidadeGerar) > 0) {
                  handleGerarUAs();
                }
              }}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalGerarOpen(false)}
              disabled={gerando}
              className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGerarUAs}
              disabled={gerando || !quantidadeGerar || Number(quantidadeGerar) <= 0}
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {gerando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Gerando...</span>
                </>
              ) : (
                <span>Confirmar</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
