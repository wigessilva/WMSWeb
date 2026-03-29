import './App.css'

export default function App() {
  return (
    <div className="flex min-h-screen font-sans text-gray-800">

      {/* SIDEBAR - Com o seu Azul Corporativo */}
      <aside className="w-64 bg-wms-sidebar text-white flex flex-col shadow-lg z-10">
        <div className="p-6 text-2xl font-bold border-b border-blue-900 tracking-wide">
          WMS System
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <a href="#" className="block p-3 rounded bg-blue-900/50 font-medium">Home</a>
          <a href="#" className="block p-3 rounded hover:bg-blue-800 transition-colors">Recebimento</a>
          <a href="#" className="block p-3 rounded hover:bg-blue-800 transition-colors">Estoque</a>
          <a href="#" className="block p-3 rounded hover:bg-blue-800 transition-colors">Gestão de Produtos</a>
        </nav>

        <div className="p-4 border-t border-blue-900">
          <a href="#" className="block p-3 rounded hover:bg-blue-800 transition-colors">Configurações</a>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL - Com o seu fundo Cinza */}
      <div className="flex-1 bg-wms-fundo flex flex-col">

        {/* TOPBAR */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-700">Home</h1>

          <div className="flex items-center space-x-6">
            {/* Seletor de Filial (Matriz/Bahia) */}
            <select className="border border-gray-300 p-2 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wms-sidebar">
              <option>Matriz (MG)</option>
              <option>Filial (BA)</option>
            </select>

            {/* Foto/Avatar do Usuário */}
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                U
              </div>
              <span className="text-sm font-medium">Usuário</span>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="p-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-2 text-wms-sidebar">Bem-vindo ao WMS</h2>
            <p className="text-gray-600">
              O layout base com a Sidebar azul e o fundo cinza está pronto. A estrutura administrativa nasceu!
            </p>
          </div>
        </main>

      </div>
    </div>
  )
}