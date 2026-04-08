import './App.css'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Perfis from './pages/Perfis'
import Usuarios from './pages/Usuarios'
import Login from './pages/Login'
import Filiais from './pages/Filiais'
import UnidadesMedida from './pages/UnidadesMedida'
import VinculosUnidades from './pages/VinculosUnidades'
import Recebimentos from './pages/Recebimentos'
import Atividades from './pages/Atividades'
import Conferencia from './pages/Conferencia'
import Produtos from './pages/Produtos'
import Familias from './pages/Familias'
import VinculosFornecedores from './pages/VinculosFornecedores'
import ParametrosMestres from './pages/ParametrosMestres'
import type { Usuario } from './types/usuario'
import { Toaster } from 'react-hot-toast'
import { Modal } from './components/Modal'

export default function App() {
  const navigate = useNavigate()

  // Tenta recuperar o usuário da sessão caso ele faça F5 (recarregar a página)
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(() => {
    const user = sessionStorage.getItem('wms_sessao_usuario');
    return user ? JSON.parse(user) : null;
  })

  const handleLogin = (usuario: Usuario) => {
    sessionStorage.setItem('wms_sessao_usuario', JSON.stringify(usuario));
    setUsuarioLogado(usuario);

    // Se o usuário tem filiais e não há nenhuma selecionada no localStorage, seleciona a primeira
    if (usuario.filiais && usuario.filiais.length > 0 && !localStorage.getItem('wms_api_url')) {
      localStorage.setItem('wms_api_url', usuario.filiais[0].url_api || 'http://localhost:8008');
    }

    // Redireciona para a Home ao logar
    navigate('/');
  }

  const handleLogout = () => {
    sessionStorage.removeItem('wms_sessao_usuario');
    setUsuarioLogado(null);

    // Reseta a rota para a Home ao deslogar
    navigate('/');
  }

  // Verifica se o usuário tem alguma permissão que comece com os prefixos indicados
  const temPermissao = (...prefixos: string[]) => {
    if (!usuarioLogado?.permissoes) return false;
    return prefixos.some(prefixo => 
      usuarioLogado.permissoes!.some(p => p.startsWith(prefixo))
    );
  }

  // Estados de controle do Layout e Menus
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [menuConfigAberto, setMenuConfigAberto] = useState(false)
  const [menuProdutosAberto, setMenuProdutosAberto] = useState(false)
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(false)
  const [modalLogoutAberto, setModalLogoutAberto] = useState(false)

  // SE NÃO HOUVER USUÁRIO LOGADO, MOSTRA APENAS O ECRÃ DE LOGIN
  if (!usuarioLogado) {
    return <Login onLogin={handleLogin} />
  }


  return (
    <div className="flex min-h-screen font-sans text-gray-800">
      <Toaster position="top-right" />
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

          {/* 1. CONFIGURAÇÕES — visível se tem permissões de CONFIGURACOES, ACESSOS ou CADASTROS */}
          {temPermissao('CONFIGURACOES.', 'ACESSOS.', 'CADASTROS.') && (
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
                {temPermissao('ACESSOS.USUARIOS') && <Link to="/usuarios" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Usuários</Link>}
                {temPermissao('ACESSOS.PERFIS') && <Link to="/perfis" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Perfis</Link>}
                {temPermissao('CADASTROS.FILIAIS') && <Link to="/filiais" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Filiais</Link>}
                {temPermissao('CADASTROS.UNIDADES_MEDIDA') && <Link to="/unidades-medida" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Unidades de Medida</Link>}
                {temPermissao('CADASTROS.VINCULOS_UNIDADE') && <Link to="/vinculos-unidades" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Vínculos de Unidades</Link>}
                {temPermissao('CONFIGURACOES.PARAMETROS') && <Link to="/parametros" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Parâmetros Mestres</Link>}
                <Link to="/impressao" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Impressão</Link>
              </div>
            )}
          </div>
          )}

          {/* 2. HOME — sempre visível */}
          <Link to="/" className="block p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium">Home</Link>

          {/* 3. GESTÃO DE PRODUTOS — visível se tem permissões de CADASTROS */}
          {temPermissao('CADASTROS.PRODUTOS', 'CADASTROS.VINCULOS_FORNECEDOR') && (
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
                {temPermissao('CADASTROS.PRODUTOS') && <Link to="/produtos" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Produtos</Link>}
                {temPermissao('CADASTROS.PRODUTOS') && <Link to="/familias" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Famílias</Link>}
                {temPermissao('CADASTROS.VINCULOS_FORNECEDOR') && <Link to="/vinculos-fornecedores" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Vínculos de Fornecedores</Link>}
              </div>
            )}
          </div>
          )}

          {/* 4. ESTOQUE — visível se tem permissões de ESTOQUE ou CADASTROS.ENDERECOS */}
          {temPermissao('ESTOQUE.', 'CADASTROS.ENDERECOS') && (
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
                {temPermissao('ESTOQUE.GERENCIAR_UAS') && <Link to="/estoque/uas" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">UAs</Link>}
                {temPermissao('CADASTROS.ENDERECOS') && <Link to="/estoque/enderecos" className="block p-2 rounded hover:bg-[#1d6197] transition-colors text-sm text-gray-300 hover:text-white">Endereços</Link>}
              </div>
            )}
          </div>
          )}

          {/* 5. RECEBIMENTO — visível se tem permissões de RECEBIMENTO */}
          {temPermissao('RECEBIMENTO.') && (
          <Link to="/recebimento" className="block p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium">Recebimento</Link>
          )}

          {/* 6. ATIVIDADES — sempre visível */}
          <Link to="/atividades" className="block p-2.5 rounded hover:bg-[#1d6197] transition-colors text-sm font-medium">Atividades</Link>


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
          <h1 className="text-lg font-semibold text-gray-700"></h1>
          <div className="flex items-center space-x-6">
            <select
              value={localStorage.getItem('wms_api_url') || ""}
              onChange={(e) => {
                localStorage.setItem('wms_api_url', e.target.value);
                // Recarrega a página para o React passar a apontar para o servidor físico escolhido
                window.location.reload();
              }}
              className="border border-gray-300 p-1.5 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wms-sidebar cursor-pointer"
            >
              {!usuarioLogado?.filiais || usuarioLogado.filiais.length === 0 ? (
                <option value="">Nenhuma filial vinculada</option>
              ) : (
                usuarioLogado.filiais.map((filial) => (
                  <option key={filial.id} value={filial.url_api || `http://localhost:8008`}>
                    {filial.nome}
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
            <Route path="/recebimento" element={<Recebimentos />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/conferencia/:id" element={<Conferencia />} />
            <Route path="/estoque" element={<h2>Estoque</h2>} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/familias" element={<Familias />} />
            <Route path="/vinculos-fornecedores" element={<VinculosFornecedores />} />
            <Route path="/perfis" element={<Perfis />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/filiais" element={<Filiais />} />
            <Route path="/unidades-medida" element={<UnidadesMedida />} />
            <Route path="/vinculos-unidades" element={<VinculosUnidades />} />
            <Route path="/parametros" element={<ParametrosMestres />} />
          </Routes>

          <Modal isOpen={modalLogoutAberto} zIndexClass="z-[9999]">
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
          </Modal>

        </main>
      </div>
    </div>
  )
}