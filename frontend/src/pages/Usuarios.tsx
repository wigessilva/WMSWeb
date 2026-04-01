import { useState, useEffect } from 'react';
import { usuarioService } from '../services/usuarioService';
import { perfilService } from '../services/perfilService';
import type { Usuario } from '../types/usuario';
import type { Perfil } from '../types/perfil';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState<number | ''>('');

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
    if (!nome.trim() || !login.trim() || !senha || perfilId === '') {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    // Validação da regra da password de 6 dígitos no Frontend
    if (!/^\d{6}$/.test(senha)) {
      alert("A password deve conter exatamente 6 dígitos numéricos.");
      return;
    }

    setCarregando(true);
    try {
      await usuarioService.criar({
        nome,
        login,
        senha,
        perfil_id: Number(perfilId),
        ativo: true
      });
      alert("Utilizador criado com sucesso!");
      setModalAberto(false);

      // Limpar formulário
      setNome('');
      setLogin('');
      setSenha('');
      setPerfilId('');

      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao criar utilizador.");
    } finally {
      setCarregando(false);
    }
  };

  const inativarUsuario = async (id: number, nomeUsuario: string) => {
    if (window.confirm(`Tem a certeza que deseja inativar o utilizador ${nomeUsuario}? O acesso ao sistema será revogado.`)) {
      try {
        await usuarioService.inativar(id);
        alert("Utilizador inativado com sucesso!");
        carregarDados();
      } catch (error: any) {
        alert(error.message || "Erro ao inativar utilizador.");
      }
    }
  };

  const getNomePerfil = (id: number) => {
    const perfil = perfis.find(p => p.id === id);
    return perfil ? perfil.nome : "Desconhecido";
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700">Gestão de Utilizadores</h2>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-[#1a63b6] text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors text-sm font-medium shadow-sm"
        >
          + Novo Utilizador
        </button>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Login</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Perfil</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Último Acesso</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Status</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Nenhum utilizador encontrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-medium">{u.nome}</td>
                    <td className="px-4 py-2 font-bold text-blue-900">{u.login}</td>
                    <td className="px-4 py-2">{getNomePerfil(u.perfil_id)}</td>
                    <td className="px-4 py-2">{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-PT') : "Nunca acedeu"}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {u.ativo && (
                        <button
                          onClick={() => inativarUsuario(u.id, u.nome)}
                          className="text-orange-500 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                        >
                          Inativar
                        </button>
                      )}
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
              <h3 className="text-lg font-bold text-gray-800">Criar Novo Utilizador</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login (Utilizador) *</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password (6 dígitos) *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso *</label>
                <select
                  value={perfilId}
                  onChange={(e) => setPerfilId(Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] bg-white"
                >
                  <option value="" disabled>Selecione um perfil...</option>
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
              <button
                onClick={salvarUsuario}
                disabled={carregando}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {carregando ? 'A guardar...' : 'Guardar Utilizador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}