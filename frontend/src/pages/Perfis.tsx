import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ActionToolbar } from '../components/ActionToolbar';
import { perfilService } from '../services/perfilService';
import type { Perfil } from '../types/perfil';
import toast from 'react-hot-toast';

export default function Perfis() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erroNome, setErroNome] = useState('');

  // Novos estados para busca, dropdown, seleção e edição
  const [termoBusca, setTermoBusca] = useState('');
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
    setErroNome('');
    setModalAberto(true);
  };

  const abrirModalEditar = () => {
    if (!perfilSelecionado) {
      toast.error("Selecione um perfil");
      return;
    }
    setModoEdicao(true);
    setNome(perfilSelecionado.nome);
    setDescricao(perfilSelecionado.descricao || '');
    setErroNome('');
    setModalAberto(true);
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
      setErroNome("O nome do perfil é obrigatório");
      return;
    }
    setErroNome('');
    setCarregando(true);
    try {
      if (modoEdicao && perfilSelecionado) {
        // Caso exista um método atualizar no seu perfilService
        await perfilService.atualizar(perfilSelecionado.id, { nome, descricao });
        toast.success("Perfil atualizado com sucesso!");
      } else {
        await perfilService.criar({ nome, descricao });
        toast.success("Perfil criado com sucesso!");
      }
      setModalAberto(false);
      carregarPerfis();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setCarregando(false);
    }
  };

  const excluirPerfil = async (id: number, nomePerfil: string) => {
    if (nomePerfil === "Administrador") {
      toast.error("O perfil Administrador não pode ser excluído.");
      return;
    }
    if (window.confirm(`Tem a certeza que deseja excluir o perfil ${nomePerfil}?`)) {
      try {
        await perfilService.excluir(id);
        toast.success("Perfil excluído com sucesso!");
        carregarPerfis();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir perfil. Verifique se existem usuários vinculados.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          acoes={[
            { label: "Adicionar", onClick: abrirModalCriar },
            { label: "Editar", onClick: abrirModalEditar },
            {
              label: "Excluir",
              isDanger: true,
              onClick: () => {
                if (!perfilSelecionado) {
                  toast.error("Selecione um perfil");
                  return;
                }
                excluirPerfil(perfilSelecionado.id, perfilSelecionado.nome);
              }
            }
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
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

      <Modal isOpen={modalAberto}>
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Perfil' : 'Criar Perfil'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (e.target.value.trim()) setErroNome('');
                }}
                error={erroNome}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" loading={carregando} onClick={salvarPerfil}>Salvar</Button>
            </div>
          </div>
      </Modal>
    </div>
  );
}