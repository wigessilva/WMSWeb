import { useState, useEffect } from 'react';
import { perfilService } from '../services/perfilService';
import type { Perfil } from '../types/perfil';

export default function Perfis() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);

  const carregarPerfis = async () => {
    try {
      const dados = await perfilService.listar();
      setPerfis(dados);
    } catch (error) {
      console.error("Erro ao carregar perfis:", error);
    }
  };

  useEffect(() => {
    carregarPerfis();
  }, []);

  const salvarPerfil = async () => {
    if (!nome.trim()) {
      alert("O nome do perfil é obrigatório.");
      return;
    }
    setCarregando(true);
    try {
      await perfilService.criar({ nome, descricao });
      alert("Perfil criado com sucesso!");
      setModalAberto(false);
      setNome('');
      setDescricao('');
      carregarPerfis();
    } catch (error: any) {
      alert(error.message || "Erro ao criar perfil.");
    } finally {
      setCarregando(false);
    }
  };

  const excluirPerfil = async (id: number, nomePerfil: string) => {
    if (nomePerfil === "Administrador") {
      alert("O perfil Administrador não pode ser excluído.");
      return;
    }
    if (window.confirm(`Tem a certeza que deseja excluir o perfil ${nomePerfil}?`)) {
      try {
        await perfilService.excluir(id);
        alert("Perfil excluído com sucesso!");
        carregarPerfis();
      } catch (error: any) {
        alert(error.message || "Erro ao excluir perfil. Verifique se existem utilizadores vinculados.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700">Gestão de Perfis de Acesso</h2>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-[#1a63b6] text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors text-sm font-medium shadow-sm"
        >
          + Novo Perfil
        </button>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-16 text-center">ID</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome do Perfil</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-1/2">Descrição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {perfis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Nenhum perfil encontrado.
                  </td>
                </tr>
              ) : (
                perfis.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-center font-medium">{p.id}</td>
                    <td className="px-4 py-2 font-semibold text-blue-900">{p.nome}</td>
                    <td className="px-4 py-2 text-gray-500">{p.descricao || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => excluirPerfil(p.id, p.nome)}
                        className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        title="Excluir Perfil"
                      >
                        Excluir
                      </button>
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
              <h3 className="text-lg font-bold text-gray-800">Criar Novo Perfil</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfil *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Operador de Empilhador"
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Pode realizar movimentações no armazém..."
                  rows={3}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
              <button
                onClick={salvarPerfil}
                disabled={carregando}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {carregando ? 'A guardar...' : 'Guardar Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}