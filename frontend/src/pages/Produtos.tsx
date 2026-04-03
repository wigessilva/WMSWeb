import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { produtoService } from '../services/produtoService'
import type { Produto } from '../types/produto'

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")
  const [dropdownAberto, setDropdownAberto] = useState(false)

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

  useEffect(() => {
    carregarProdutos()
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
                carregarProdutos(e.target.value);
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
                <button
                  onClick={() => {
                    if (!produtoSelecionado) {
                      toast.error("Selecione um produto na tabela.");
                      return;
                    }
                    setDropdownAberto(false);
                    // TODO: Implementar edição
                    toast.success("Ação de Editar selecionada");
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDropdownAberto(false);
                    sincronizarEAtualizar();
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50"
                >
                  Sincronizar
                </button>
              </div>
            )}
          </div>
        </div>

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
    </div>
  )
}