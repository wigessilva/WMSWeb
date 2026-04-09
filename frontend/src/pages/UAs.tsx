import { useState, useEffect } from 'react'
import { uaService } from '../services/uaService'
import { ActionToolbar } from '../components/ActionToolbar'
import type { UA } from '../types/ua'
import { toast } from 'react-hot-toast'

export default function UAs() {
  const [uas, setUas] = useState<UA[]>([])
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

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
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Lote</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Endereço</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Val</th>
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
                    <td className="px-3 py-2">{ua.lote || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                        {ua.endereco_id ? `ID: ${ua.endereco_id}` : "Em Trânsito"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                       {ua.data_validade ? new Date(ua.data_validade).toLocaleDateString('pt-BR') : "-"}
                    </td>
                     <td className="px-3 py-2 text-center text-xs">
                      {ua.largura || 0}x{ua.comprimento || 0}x{ua.altura || 0}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        ua.estado === "Bom" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
    </div>
  )
}
