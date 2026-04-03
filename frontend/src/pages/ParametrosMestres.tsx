import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { parametrosMestresService } from '../services/parametrosMestresService'

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
          {salvando ? "Salvando..." : "Salvar Alterações"}
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
      </div>
    </div>
  )
}