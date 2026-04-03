import { useState, useEffect, useMemo } from 'react';
import { usuarioService } from '../services/usuarioService';
import { perfilService } from '../services/perfilService';
import type { Usuario } from '../types/usuario';
import type { Perfil } from '../types/perfil';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Novos controles da tela
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState<number | ''>('');
  const [senhaAutorizacao, setSenhaAutorizacao] = useState('');

  // Subimos a função para ser utilizada no filtro abaixo
  const getNomePerfil = (id: number) => {
    const perfil = perfis.find(p => p.id === id);
    return perfil ? perfil.nome : "Desconhecido";
  };

  // Filtragem em memória (Alta Performance O(N))
  const usuariosFiltrados = useMemo(() => {
    if (!termoBusca) return usuarios;
    const termo = termoBusca.toLowerCase();
    return usuarios.filter(u =>
      u.nome.toLowerCase().includes(termo) ||
      u.login.toLowerCase().includes(termo) ||
      getNomePerfil(u.perfil_id).toLowerCase().includes(termo)
    );
  }, [usuarios, termoBusca, perfis]);

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setNome('');
    setLogin('');
    setSenha('');
    setPerfilId('');
    setSenhaAutorizacao('');
    setModalAberto(true);
    setDropdownAberto(false);
  };

  const abrirModalEditar = () => {
    if (!usuarioSelecionado) {
      alert("Selecione um usuário");
      return;
    }
    setModoEdicao(true);
    setNome(usuarioSelecionado.nome);
    setLogin(usuarioSelecionado.login);
    setSenha(''); // Deixamos em branco. Se o administrador quiser alterar a senha, ele digita. Se deixar em branco, mantém a antiga.
    setPerfilId(usuarioSelecionado.perfil_id);
    setSenhaAutorizacao('');
    setModalAberto(true);
    setDropdownAberto(false);
  };

  const carregarDados = async () => {
    try {
      const [dadosUsuarios, dadosPerfis] = await Promise.all([
        usuarioService.listar(),
        perfilService.listar()
      ]);
      setUsuarios(dadosUsuarios);
      setPerfis(dadosPerfis);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const salvarUsuario = async () => {
    if (!nome.trim() || !login.trim() || perfilId === '' || (!modoEdicao && !senha)) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (modoEdicao && !senhaAutorizacao) {
      alert("Por favor, digite a sua password para autorizar a alteração.");
      return;
    }

    if (senha && !/^\d{6}$/.test(senha)) {
      alert("A password deve conter exatamente 6 dígitos numéricos.");
      return;
    }

    // Recupera o ID de quem está logado na sessão do WMS
    const sessao = sessionStorage.getItem('wms_sessao_usuario');
    const usuarioLogadoId = sessao ? JSON.parse(sessao).id : 1;

    setCarregando(true);
    try {
      if (modoEdicao && usuarioSelecionado) {
        const dadosAtualizados: any = {
          nome,
          login,
          perfil_id: Number(perfilId),
          usuario_logado_id: usuarioLogadoId,
          senha_autorizacao: senhaAutorizacao
        };
        if (senha) dadosAtualizados.senha = senha;

        await usuarioService.atualizar(usuarioSelecionado.id, dadosAtualizados);
        alert("Usuário atualizado com sucesso!");
      } else {
        await usuarioService.criar({ nome, login, senha, perfil_id: Number(perfilId), ativo: true });
        alert("Usuário criado com sucesso!");
      }

      setModalAberto(false);
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar usuário");
    } finally {
      setCarregando(false);
    }
  };

  const inativarUsuario = async (id: number, nomeUsuario: string) => {
    if (window.confirm(`Tem a certeza que deseja inativar o usuário ${nomeUsuario}? O acesso ao sistema será revogado.`)) {
      try {
        await usuarioService.inativar(id);
        alert("Usuário inativado com sucesso!");
        carregarDados();
      } catch (error: any) {
        alert(error.message || "Erro ao inativar usuário");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">

          {/* CAMPO DE BUSCA ESQUERDA */}
          <div className="flex w-1/6 min-w-[125px]">
            <input
              type="text"
              placeholder="Buscar"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
            />
          </div>

          {/* BOTÃO AÇÕES DIREITA */}
          <div className="relative">
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className="bg-[#1a63b6] text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm"
            >
              Ações <span className="ml-2 text-xs">▼</span>
            </button>

            {dropdownAberto && (
              <div className="absolute top-10 right-0 w-40 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden">
                <button onClick={abrirModalCriar} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Adicionar</button>
                <button onClick={abrirModalEditar} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100">Editar</button>
                <button
                  onClick={() => {
                    if (!usuarioSelecionado) {
                      alert("Selecione um usuário");
                      return;
                    }
                    if (!usuarioSelecionado.ativo) {
                      alert("Este usuário já se encontra inativo.");
                      setDropdownAberto(false);
                      return;
                    }
                    inativarUsuario(usuarioSelecionado.id, usuarioSelecionado.nome);
                    setDropdownAberto(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 font-medium"
                >
                  Inativar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Login</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Perfil</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Último Acesso</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setUsuarioSelecionado(u)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      usuarioSelecionado?.id === u.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-medium">{u.nome}</td>
                    <td className="px-4 py-2 font-bold text-blue-900">{u.login}</td>
                    <td className="px-4 py-2">{getNomePerfil(u.perfil_id)}</td>
                    <td className="px-4 py-2">{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-PT') : "Nunca logou"}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Usuário' : 'Criar Usuário'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {modoEdicao ? '' : ''}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value.replace(/\D/g, ''))} // Força a digitar apenas números
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
                <select
                  value={perfilId}
                  onChange={(e) => setPerfilId(Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] bg-white"
                >
                  <option value="" disabled>Selecione...</option>
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>

                {/* CAMPO DE AUTORIZAÇÃO DE SEGURANÇA */}
              {modoEdicao && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <label className="block text-sm font-medium text-red-800 mb-1">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={senhaAutorizacao}
                    onChange={(e) => setSenhaAutorizacao(e.target.value.replace(/\D/g, ''))}
                    placeholder="Digite a sua senha para confirmar"
                    className="w-full border border-red-200 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  />
                  <p className="text-xs text-red-600 mt-1">
                    Confirme que é você para salvar as alterações
                  </p>
                </div>
              )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
              <button
                onClick={salvarUsuario}
                disabled={carregando}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {carregando ? 'A guardar...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}