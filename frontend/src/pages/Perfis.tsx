import { useState, useEffect, useMemo } from 'react';
import { perfilService } from '../services/perfilService';
import type { Perfil } from '../types/perfil';

export default function Perfis() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Novos estados para busca, dropdown, seleção e edição
  const [termoBusca, setTermoBusca] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Perfil | null>(null);

  // Filtragem em memória
  const perfisFiltrados = useMemo(() => {
    if (!termoBusca) return perfis;
    const termo = termoBusca.toLowerCase();
    return perfis.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      (p.descricao && p.descricao.toLowerCase().includes(termo))
    );
  }, [perfis, termoBusca]);

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setNome('');
    setDescricao('');
    setModalAberto(true);
    setDropdownAberto(false);
  };

  const abrirModalEditar = () => {
    if (!perfilSelecionado) {
      alert("Selecione um perfil");
      return;
    }
    setModoEdicao(true);
    setNome(perfilSelecionado.nome);
    setDescricao(perfilSelecionado.descricao || '');
    setModalAberto(true);
    setDropdownAberto(false);
  };

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
      alert("O nome do perfil é obrigatório");
      return;
    }
    setCarregando(true);
    try {
      if (modoEdicao && perfilSelecionado) {
        // Caso exista um método atualizar no seu perfilService
        await perfilService.atualizar(perfilSelecionado.id, { nome, descricao });
        alert("Perfil atualizado com sucesso!");
      } else {
        await perfilService.criar({ nome, descricao });
        alert("Perfil criado com sucesso!");
      }
      setModalAberto(false);
      carregarPerfis();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar perfil");
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
        alert(error.message || "Erro ao excluir perfil. Verifique se existem usuários vinculados.");
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
                    if (!perfilSelecionado) {
                      alert("Selecione um perfil");
                      return;
                    }
                    excluirPerfil(perfilSelecionado.id, perfilSelecionado.nome);
                    setDropdownAberto(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome do Perfil</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-1/2">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {perfisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                    Nenhum perfil encontrado.
                  </td>
                </tr>
              ) : (
                perfisFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setPerfilSelecionado(p)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      perfilSelecionado?.id === p.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-semibold text-blue-900">{p.nome}</td>
                    <td className="px-4 py-2 text-gray-500">{p.descricao || "-"}</td>
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
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Perfil' : 'Criar Perfil'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfil</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Estoquista"
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Realiza recebimento, liberação e expedição de materias"
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
                {carregando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}