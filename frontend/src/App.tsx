import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useEffect } from 'react'
import { recebimentoService } from './services/recebimentoService'
import type { Recebimento } from './types/recebimento'
import { configuracaoService } from './services/configuracaoService'

export default function App() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [recebimentoSelecionado, setRecebimentoSelecionado] = useState<Recebimento | null>(null)
  const [carregando, setCarregando] = useState(false)

  const [caminhoPasta, setCaminhoPasta] = useState("")
  const [roboAtivo, setRoboAtivo] = useState(false)

  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [modalConfigAberto, setModalConfigAberto] = useState(false)
  const [modalOCAberto, setModalOCAberto] = useState(false)
  const [ocDigitada, setOcDigitada] = useState("")

// Função para puxar os dados do Python
  const carregarRecebimentos = async () => {
    try {
      const dados = await recebimentoService.listar()
      setRecebimentos(dados)
    } catch (error) {
      console.error("Erro ao carregar notas:", error)
    }
  }

  // O React chama isto sozinho quando o sistema inicia
  useEffect(() => {
    carregarRecebimentos()
  }, [])

  useEffect(() => {
    configuracaoService.getRoboConfig().then(dados => {
      setCaminhoPasta(dados.caminho_diretorio || "")
    }).catch(err => console.error("Erro ao carregar configuração inicial", err))
  }, [])

  const guardarConfiguracao = async () => {
    try {
      await configuracaoService.updateRoboConfig(caminhoPasta)
      alert("Configuração guardada com sucesso! O robô já sabe onde procurar.")
      setModalConfigAberto(false)
    } catch (error) {
      console.error("Detalhes do erro:", error)
      alert("Erro ao guardar configuração. Verifique o console para mais detalhes.")
    }
  }

  const salvarOC = async () => {
    if (!recebimentoSelecionado) return

    if (!ocDigitada || ocDigitada.trim() === "") {
      alert("Por favor, digite uma OC válida.")
      return
    }

    setCarregando(true)
    try {
      // Agora a chamada é real e atravessa a ponte até o FastAPI!
      const recAtualizado = await recebimentoService.vincularOC(recebimentoSelecionado.id, ocDigitada)

      // Atualiza o recebimento na tela com os dados reais que voltaram do banco
      const novosRecebimentos = recebimentos.map(rec =>
        rec.id === recebimentoSelecionado.id ? recAtualizado : rec
      )

      setRecebimentos(novosRecebimentos)
      setRecebimentoSelecionado(recAtualizado)

      alert(`OC ${ocDigitada} encontrada no ERP e vinculada com sucesso!`)
      setModalOCAberto(false)
    } catch (error) {
      console.error("Erro ao buscar OC:", error)
      alert("Erro na comunicação com o servidor ou OC não encontrada.")
    } finally {
      setCarregando(false)
    }
  }

  // Criamos uma referência para o input de arquivo invisível
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função que é chamada quando o usuário seleciona o arquivo na janelinha do Windows
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return // Se o usuário cancelou a janelinha, não faz nada
    }

    // Pede o CNPJ logo após escolher o arquivo
    const cnpj = prompt(`Arquivo "${file.name}" selecionado!\n\nDigite o CNPJ do fornecedor (apenas números):`)
    if (!cnpj) {
      // Limpa o input caso o usuário cancele
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setCarregando(true)

    try {
      // Como o seu backend espera o XML já convertido em JSON (segundo os comentários do seu service),
      // aqui estamos mantendo a simulação dos dados.
      // Em um cenário real, você leria o arquivo XML aqui e o converteria para JSON antes de enviar.
      const dadosSimulados = {
        nfe: Math.floor(Math.random() * 100000).toString(), // Gera um número de nota aleatório
        fornecedor: "Indústria de Papel e Celulose S.A.",
        itens: [
          {
            descricao: "Bobina Kraft 80g",
            qtd_nota: 5000,
            und: "KG"
          }
        ]
      }

      // Chama o seu service que se comunica com o FastAPI
      const novoRecebimento = await recebimentoService.importar(dadosSimulados, cnpj)

      // Adiciona o novo recebimento na lista para aparecer na tabela
      setRecebimentos([...recebimentos, novoRecebimento])
      alert("Romaneio importado com sucesso!")

    } catch (error) {
      console.error("Erro ao importar:", error)
      alert("Erro ao comunicar com o backend. Verifique se o FastAPI está rodando na porta 8000.")
    } finally {
      setCarregando(false)
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se precisar
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Função que o botão azul chama para "abrir" o input invisível
  const abrirSelecionadorDeArquivo = () => {
    fileInputRef.current?.click()
  }

  const sincronizarEAtualizar = async () => {
    setCarregando(true)
    try {
      await recebimentoService.sincronizarOCsPendentes()
      await carregarRecebimentos()
    } catch (error) {
      console.error("Erro na sincronização:", error)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen font-sans text-gray-800">
      {/* SIDEBAR */}
      <aside className="w-56 bg-wms-sidebar text-white flex flex-col shadow-lg z-10">
        <div className="p-4 text-xl font-bold border-b border-blue-900 tracking-wide">
          WMS System
        </div>
        <nav className="flex-1 p-3 space-y-1 mt-2">
          <Link to="/" className="block p-2.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium">Home</Link>
          <Link to="/recebimento" className="block p-2.5 rounded hover:bg-blue-800 transition-colors text-sm">Recebimento</Link>
          <Link to="/estoque" className="block p-2.5 rounded hover:bg-blue-800 transition-colors text-sm">Estoque</Link>
          <Link to="/produtos" className="block p-2.5 rounded hover:bg-blue-800 transition-colors text-sm">Gestão de Produtos</Link>
        </nav>

        {/* AVATAR DO USUÁRIO */}
        <div className="p-4 border-t border-blue-900 flex items-center space-x-3 cursor-pointer hover:bg-blue-800 transition-colors">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-800 font-bold text-sm">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Usuário</span>
            <span className="text-xs text-blue-300">Sair</span>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 bg-wms-fundo flex flex-col">
        {/* TOPBAR */}
        <header className="h-14 bg-white shadow-sm flex items-center justify-between px-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-700">WMS Operacional</h1>
          <div className="flex items-center space-x-6">
            <select className="border border-gray-300 p-1.5 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wms-sidebar">
              <option>Matriz (MG)</option>
              <option>Filial (BA)</option>
            </select>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="p-4">
          <Routes>
            <Route path="/" element={<h2 className="text-2xl font-bold text-wms-sidebar">Dashboard Central</h2>} />

            <Route path="/recebimento" element={
              <div className="space-y-4">

                {/* TABELA DE CABEÇALHO (Mestre) */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-end mb-3 relative">
                    <button
                      onClick={() => setDropdownAberto(!dropdownAberto)}
                      className="bg-wms-sidebar text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm"
                    >
                      Ações <span className="ml-2 text-xs">▼</span>
                    </button>

                    {dropdownAberto && (
                      <div className="absolute top-10 right-0 w-52 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden">
                        <button onClick={() => { sincronizarEAtualizar(); setDropdownAberto(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Atualizar</button>
                        <button onClick={() => { setModalConfigAberto(true); setDropdownAberto(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Configurar Pasta XML</button>
                        <button
                          onClick={() => {
                            if (!recebimentoSelecionado) {
                              alert("Selecione um romaneio na tabela para editar a OC.");
                              return;
                            }
                            setOcDigitada(recebimentoSelecionado.oc || "");
                            setModalOCAberto(true);
                            setDropdownAberto(false);
                          }}
                          className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100"
                        >
                          Editar OC
                        </button>
                        <button onClick={() => setDropdownAberto(false)} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Vincular SKU</button>
                        <button onClick={() => setDropdownAberto(false)} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50">Alterar Destino</button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-72 border border-gray-200 rounded">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="sticky top-0 bg-gray-50 shadow-sm">
                        <tr className="text-gray-700 text-sm">
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Romaneio</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">NFe</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">OC</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Fornecedor</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Conferente</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Início</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Conclusão</th>
                          <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 text-sm">
                        {recebimentos.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                              Nenhuma nota encontrada. O robô já importou algo?
                            </td>
                          </tr>
                        ) : (
                          recebimentos.map((rec) => (
                            <tr
                              key={rec.id}
                              onClick={() => setRecebimentoSelecionado(rec)}
                              className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                                recebimentoSelecionado?.id === rec.id ? "bg-blue-100" : ""
                              }`}
                            >
                              <td className="px-3 py-1.5 font-medium">#{rec.id}</td>
                              <td className="px-3 py-1.5 font-bold text-blue-900">{rec.nfe}</td>
                              <td className="px-3 py-1.5">{rec.oc || "-"}</td>
                              <td className="px-3 py-1.5">{rec.fornecedor}</td>
                              <td className="px-3 py-1.5">{rec.conferente_id || "-"}</td>
                              <td className="px-3 py-1.5">{rec.data_inicio ? new Date(rec.data_inicio).toLocaleDateString('pt-BR') : "-"}</td>
                              <td className="px-3 py-1.5">{rec.conclusao ? new Date(rec.conclusao).toLocaleDateString('pt-BR') : "-"}</td>
                              <td className="px-3 py-1.5">
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABELA DE ITENS (Detalhe) */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 min-h-[300px]">
                  {!recebimentoSelecionado ? (
                    <div className="flex items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-200 rounded">
                      Selecione um romaneio na tabela acima para ver os seus itens.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-700 text-sm">
                          <tr>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">SKU</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Descrição</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Qtd Nota</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Qtd Recebida</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Und</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Lote</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Fab</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Val</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Vencimento</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Int. Embalagem</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Int. Material</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Identificação</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Certif. Qualidade</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Destino</th>
                            <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                          {recebimentoSelecionado.itens.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-1.5 font-medium text-blue-800">{item.sku || "N/A"}</td>
                              <td className="px-3 py-1.5">{item.descricao}</td>
                              <td className="px-3 py-1.5 font-medium text-center">{item.qtd_nota}</td>
                              <td className="px-3 py-1.5 font-bold text-blue-600 text-center">{item.qtd_recebida || 0}</td>
                              <td className="px-3 py-1.5 text-center">{item.und}</td>
                              <td className="px-3 py-1.5">{item.lote || "-"}</td>
                              <td className="px-3 py-1.5">{item.data_fabricacao ? new Date(item.data_fabricacao).toLocaleDateString('pt-BR') : "-"}</td>
                              <td className="px-3 py-1.5">{item.data_validade ? new Date(item.data_validade).toLocaleDateString('pt-BR') : "-"}</td>
                              <td className="px-3 py-1.5">{item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : "-"}</td>
                              <td className="px-3 py-1.5 text-center">{item.integridade_embalagem !== null ? (item.integridade_embalagem ? "Sim" : "Não") : "-"}</td>
                              <td className="px-3 py-1.5 text-center">{item.integridade_material !== null ? (item.integridade_material ? "Sim" : "Não") : "-"}</td>
                              <td className="px-3 py-1.5 text-center">{item.identificacao !== null ? (item.identificacao ? "Sim" : "Não") : "-"}</td>
                              <td className="px-3 py-1.5 text-center">{item.certificado_qualidade !== null ? (item.certificado_qualidade ? "Sim" : "Não") : "-"}</td>
                              <td className="px-3 py-1.5">{item.destino || "-"}</td>
                              <td className="px-3 py-1.5">
                                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            } />

            <Route path="/estoque" element={<h2>Estoque</h2>} />
            <Route path="/produtos" element={<h2>Gestão de Produtos</h2>} />
          </Routes>

          {modalConfigAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-wms-sidebar">Configurar Pasta XML (NFe)</h3>
                  <button onClick={() => setModalConfigAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caminho da Pasta de Origem</label>
                  <input
                    type="text"
                    value={caminhoPasta}
                    onChange={(e) => setCaminhoPasta(e.target.value)}
                    placeholder="Ex: C:\XMLs_Entrada ou \\Servidor\Notas"
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-wms-sidebar"
                  />
                  <p className="text-xs text-gray-500 mt-2">O sistema varre esta pasta em busca de notas fiscais.</p>
                </div>

                <div className="flex justify-end space-x-3 mt-4">
                  <button onClick={() => setModalConfigAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
                  <button onClick={guardarConfiguracao} className="px-4 py-2 text-sm font-medium text-white bg-wms-sidebar hover:bg-blue-800 rounded transition-colors">Salvar</button>
                </div>
              </div>
            </div>
          )}

          {modalOCAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-wms-sidebar">Editar Ordem de Compra</h3>
                  <button onClick={() => setModalOCAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número da OC no ERP</label>
                  <input
                    type="text"
                    value={ocDigitada}
                    onChange={(e) => setOcDigitada(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-wms-sidebar"
                  />
                  <p className="text-xs text-gray-500 mt-2">O sistema irá procurar e validar este número na tabela PedidosCompra do ERP.</p>
                </div>

                <div className="flex justify-end space-x-3 mt-4">
                  <button onClick={() => setModalOCAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
                  <button onClick={salvarOC} disabled={carregando} className="px-4 py-2 text-sm font-medium text-white bg-wms-sidebar hover:bg-blue-800 rounded transition-colors disabled:opacity-50">
                    {carregando ? 'Buscando...' : 'Buscar e Vincular'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}