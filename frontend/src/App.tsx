import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useEffect } from 'react'
import { recebimentoService } from './services/recebimentoService'
import type { Recebimento } from './types/recebimento'
import { configuracaoService } from './services/configuracaoService'
import Perfis from './pages/Perfis'
import Usuarios from './pages/Usuarios'
import Login from './pages/Login'
import type { Usuario } from './types/usuario'

export default function App() {
  // Tenta recuperar o utilizador da sessão caso ele faça F5 (recarregar a página)
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(() => {
    const user = sessionStorage.getItem('wms_sessao_usuario');
    return user ? JSON.parse(user) : null;
  })

  const handleLogin = (usuario: Usuario) => {
    sessionStorage.setItem('wms_sessao_usuario', JSON.stringify(usuario));
    setUsuarioLogado(usuario);
  }

  const handleLogout = () => {
    sessionStorage.removeItem('wms_sessao_usuario');
    setUsuarioLogado(null);
  }

  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [recebimentoSelecionado, setRecebimentoSelecionado] = useState<Recebimento | null>(null)
  const [carregando, setCarregando] = useState(false)

  const [caminhoPasta, setCaminhoPasta] = useState("")
  const [roboAtivo, setRoboAtivo] = useState(false)

  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [modalConfigAberto, setModalConfigAberto] = useState(false)
  const [modalOCAberto, setModalOCAberto] = useState(false)
  const [ocDigitada, setOcDigitada] = useState("")
  const [modalLogoutAberto, setModalLogoutAberto] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(true)

  // Controles dos menus da Sidebar
  const [menuConfigAberto, setMenuConfigAberto] = useState(false)
  const [menuProdutosAberto, setMenuProdutosAberto] = useState(false)
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(false)

  // Estado para armazenar as filiais vindas do banco
  const [filiais, setFiliais] = useState<any[]>([])

  useEffect(() => {
    const buscarFiliais = async () => {
      try {
        const urlBase = localStorage.getItem('wms_api_url') || 'http://localhost:8006';
        // Ajuste a rota se o seu endpoint for diferente (ex: usando api.get('/filiais'))
        const response = await fetch(`${urlBase}/filiais/`);
        if (response.ok) {
          const dados = await response.json();
          // Filtra para exibir na Topbar apenas as filiais ativas
          setFiliais(dados.filter((f: any) => f.ativo !== false));
        }
      } catch (error) {
        console.error("Erro ao buscar filiais do banco:", error);
      }
    };

    buscarFiliais();
  }, []);

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

  // SE NÃO HOUVER UTILIZADOR LOGADO, MOSTRA APENAS O ECRÃ DE LOGIN
  if (!usuarioLogado) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex min-h-screen font-sans text-gray-800">
      {/* SIDEBAR */}
      <aside className={`bg-wms-sidebar text-white flex flex-col shadow-lg z-10 transition-all duration-300 overflow-x-hidden ${sidebarAberta ? 'w-56' : 'w-16'}`}>
        <div className={`p-4 flex items-center ${sidebarAberta ? 'justify-between' : 'justify-center'} min-h-[60px] whitespace-nowrap`}>
          {sidebarAberta && <span className="text-xl font-bold tracking-wide">WMS</span>}
          <button
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="p-1 hover:bg-[#1d6197] rounded transition-colors flex-shrink-0 text-white"
            title={sidebarAberta ? "Fechar menu" : "Abrir menu"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {sidebarAberta ? (
          <nav className="flex-1 p-3 space-y-2 mt-2 overflow-y-auto overflow-x-hidden whitespace-nowrap">

          {/* 1. CONFIGURAÇÕES */}
          <div>
            <button
              onClick={() => setMenuConfigAberto(!menuConfigAberto)}
              className="w-full text-left p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium flex justify-between items-center"
            >
              Configurações
              <span className="text-xs font-bold">{menuConfigAberto ? 'v' : '<'}</span>
            </button>
            {menuConfigAberto && (
              <div className="pl-4 mt-1 space-y-1 ml-2">
                <Link to="/usuarios" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Usuários</Link>
                <Link to="/perfis" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Perfis</Link>
                <Link to="/filiais" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Filiais</Link>
                <Link to="/unidades-medida" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Unidades de Medida</Link>
                <Link to="/parametros" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Parâmetros Mestres</Link>
                <Link to="/impressao" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Impressão</Link>
              </div>
            )}
          </div>

          {/* 2. HOME */}
          <Link to="/" className="block p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium">Home</Link>

          {/* 3. GESTÃO DE PRODUTOS */}
          <div>
            <button
              onClick={() => setMenuProdutosAberto(!menuProdutosAberto)}
              className="w-full text-left p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium flex justify-between items-center"
            >
              Gestão de Produtos
              <span className="text-xs font-bold">{menuProdutosAberto ? 'v' : '<'}</span>
            </button>
            {menuProdutosAberto && (
              <div className="pl-4 mt-1 space-y-1 ml-2">
                <Link to="/produtos" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Produtos</Link>
                <Link to="/familias" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Famílias</Link>
                <Link to="/vinculos-fornecedores" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Vínculos de Fornecedores</Link>
              </div>
            )}
          </div>

          {/* 4. ESTOQUE */}
          <div>
            <button
              onClick={() => setMenuEstoqueAberto(!menuEstoqueAberto)}
              className="w-full text-left p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium flex justify-between items-center"
            >
              Estoque
              <span className="text-xs font-bold">{menuEstoqueAberto ? 'v' : '<'}</span>
            </button>
            {menuEstoqueAberto && (
              <div className="pl-4 mt-1 space-y-1 ml-2">
                <Link to="/estoque/uas" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">UAs</Link>
                <Link to="/estoque/enderecos" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Endereços</Link>
              </div>
            )}
          </div>

          {/* 5. RECEBIMENTO */}
          <Link to="/recebimento" className="block p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium">Recebimento</Link>

          </nav>
        ) : (
          <div className="flex-1"></div>
        )}

        {/* AVATAR DO USUÁRIO */}
        <div
          onClick={() => setModalLogoutAberto(true)}
          className={`p-4 flex items-center cursor-pointer hover:bg-[#1d6197] transition-colors whitespace-nowrap ${sidebarAberta ? 'space-x-3' : 'justify-center'}`}
          title="Clique para sair do sistema"
        >
          <div className="w-8 h-8 flex-shrink-0 bg-blue-300 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm uppercase">
            {usuarioLogado.nome.charAt(0)}
          </div>
          {sidebarAberta && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate w-32">{usuarioLogado.nome}</span>
              <span className="text-xs text-blue-300 hover:text-white transition-colors">Encerrar Sessão</span>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 bg-wms-fundo flex flex-col">
        {/* TOPBAR */}
        <header className="h-14 bg-white shadow-sm flex items-center justify-between px-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-700">WMS Operacional</h1>
          <div className="flex items-center space-x-6">
            <select
              value={localStorage.getItem('wms_api_url') || "http://localhost:8006"}
              onChange={(e) => {
                localStorage.setItem('wms_api_url', e.target.value);
                // Recarrega a página para limpar os estados antigos e buscar os dados da nova filial
                window.location.reload();
              }}
              className="border border-gray-300 p-1.5 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wms-sidebar cursor-pointer"
            >
              {filiais.length === 0 ? (
                <option value="http://localhost:8006">Carregando filiais...</option>
              ) : (
                filiais.map((filial) => (
                  // Substitua 'url_api' pelo nome exato da coluna no seu banco onde você guarda o IP/URL do servidor da filial
                  <option key={filial.id} value={filial.url_api || `http://${filial.ip}:8005`}>
                    {filial.nome} {filial.is_matriz ? "(Matriz)" : "(Filial)"}
                  </option>
                ))
              )}
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
                      className="bg-[#1a63b6] text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm"
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
            <Route path="/perfis" element={<Perfis />} />
            <Route path="/usuarios" element={<Usuarios />} />
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
                  <p className="text-xs text-gray-500 mt-2">O sistema irá procurar e validar este número na tabela de pedidos de compra do ERP.</p>
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

          {modalLogoutAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Encerrar Sessão</h3>
                <p className="text-gray-600 text-sm mb-6">Tem certeza que deseja sair do sistema?</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setModalLogoutAberto(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors w-full"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      handleLogout()
                      setModalLogoutAberto(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors w-full shadow-sm"
                  >
                    Sair
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