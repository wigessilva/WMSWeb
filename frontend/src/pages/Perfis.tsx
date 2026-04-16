import { useState, useEffect, useMemo } from 'react';
import { usePermissao } from '../hooks/usePermissao';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ActionToolbar } from '../components/ActionToolbar';
import { perfilService } from '../services/perfilService';
import { permissaoService, MODULO_LABELS } from '../services/permissaoService';
import type { Perfil } from '../types/perfil';
import type { PermissaoInfo } from '../services/permissaoService';
import toast from 'react-hot-toast';

export default function Perfis() {
  const { temPermissao } = usePermissao();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erroNome, setErroNome] = useState('');

  const [termoBusca, setTermoBusca] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Perfil | null>(null);

  // Permissões disponíveis agrupadas por módulo
  const [permissoesAgrupadas, setPermissoesAgrupadas] = useState<Record<string, PermissaoInfo[]>>({});
  // Chaves das permissões selecionadas no modal
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<Set<string>>(new Set());

  const isAdmin = nome.toUpperCase() === 'ADMINISTRADOR';

  // Permissões do editor (usuário logado)
  const permissoesDoEditor: string[] = (() => {
    const sessao = localStorage.getItem('wms_sessao_usuario');
    return sessao ? (JSON.parse(sessao).permissoes || []) : [];
  })();

  // Verifica se o editor pode delegar uma permissão específica
  const podeDelegarPermissao = (chave: string) => permissoesDoEditor.includes(chave);

  const perfisFiltrados = useMemo(() => {
    if (!termoBusca) return perfis;
    const termo = termoBusca.toLowerCase();
    return perfis.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      (p.descricao && p.descricao.toLowerCase().includes(termo))
    );
  }, [perfis, termoBusca]);

  const carregarDados = async () => {
    try {
      const [dadosPerfis, dadosPermissoes] = await Promise.all([
        perfilService.listar(),
        permissaoService.listarAgrupadas()
      ]);
      setPerfis(dadosPerfis);
      setPermissoesAgrupadas(dadosPermissoes);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setNome('');
    setDescricao('');
    setPermissoesSelecionadas(new Set());
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
    // Carrega as permissões atuais do perfil
    const chaves = new Set(perfilSelecionado.permissoes?.map(p => p.chave) || []);
    setPermissoesSelecionadas(chaves);
    setErroNome('');
    setModalAberto(true);
  };

  const togglePermissao = (chave: string) => {
    if (isAdmin) return;
    if (!podeDelegarPermissao(chave)) return; // Delegação: só pode mexer no que tem
    setPermissoesSelecionadas(prev => {
      const novo = new Set(prev);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  };

  const salvarPerfil = async () => {
    if (!nome.trim()) {
      setErroNome("O nome do perfil é obrigatório");
      return;
    }
    setErroNome('');
    setCarregando(true);
    try {
      // Ao salvar, inclui tanto as permissões selecionáveis quanto as não-delegáveis
      // que o perfil já possuía (para não perdê-las)
      const permissoesParaSalvar = Array.from(permissoesSelecionadas);

      // Em modo edição, preserva as permissões que o editor não pode delegar
      if (modoEdicao && perfilSelecionado) {
        const permissoesOriginais = perfilSelecionado.permissoes?.map(p => p.chave) || [];
        for (const chave of permissoesOriginais) {
          if (!podeDelegarPermissao(chave) && !permissoesParaSalvar.includes(chave)) {
            permissoesParaSalvar.push(chave);
          }
        }
      }

      const permissoes = permissoesParaSalvar;

      if (modoEdicao && perfilSelecionado) {
        await perfilService.atualizar(perfilSelecionado.id, { nome, descricao, permissoes, editor_permissoes: permissoesDoEditor });
        toast.success("Perfil atualizado com sucesso!");
      } else {
        await perfilService.criar({ nome, descricao, permissoes, editor_permissoes: permissoesDoEditor });
        toast.success("Perfil criado com sucesso!");
      }
      setModalAberto(false);
      carregarDados();
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
        carregarDados();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir perfil. Verifique se existem usuários vinculados.");
      }
    }
  };

  // Conta o total de permissões para mostrar na tabela
  const contarPermissoes = (perfil: Perfil) => {
    return perfil.permissoes?.length || 0;
  };

  // Ordem fixa dos módulos
  const ordemModulos = ['RECEBIMENTO', 'ESTOQUE', 'CADASTROS', 'CONFIGURACOES', 'ACESSOS'];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          acoes={[
            ...(temPermissao('ACESSOS.PERFIS') ? [
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
            ] : [])
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-1/2">Descrição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Permissões</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {perfisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    Nenhum perfil encontrado.
                  </td>
                </tr>
              ) : (
                perfisFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setPerfilSelecionado(p)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${perfilSelecionado?.id === p.id ? "bg-blue-100" : ""
                      }`}
                  >
                    <td className="px-4 py-2 font-semibold text-blue-900">{p.nome}</td>
                    <td className="px-4 py-2 text-gray-500">{p.descricao || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
                        {contarPermissoes(p)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Perfil' : 'Criar Perfil'}</h3>
            <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (e.target.value.trim()) setErroNome('');
                }}
                error={erroNome}
                disabled={isAdmin && modoEdicao}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                  disabled={isAdmin && modoEdicao}
                />
              </div>
            </div>

            {/* CARDS DE PERMISSÕES */}
            <div className="border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Permissões do Perfil</h4>

              {isAdmin && modoEdicao && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  🔒 O perfil Administrador não pode ser editado.
                </div>
              )}

              <div className="space-y-3">
                {ordemModulos.map(modulo => {
                  const permissoes = permissoesAgrupadas[modulo];
                  if (!permissoes || permissoes.length === 0) return null;

                  const label = MODULO_LABELS[modulo] || modulo;
                  const todasMarcadas = permissoes.every(p => permissoesSelecionadas.has(p.chave));
                  const algumaMarcada = permissoes.some(p => permissoesSelecionadas.has(p.chave));

                  return (
                    <div key={modulo} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header do card */}
                      <div
                        className="bg-gray-50 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          if (isAdmin && modoEdicao) return;
                          // Delegação: só faz toggle nas permissões que o editor pode delegar
                          const permissoesDelegaveis = permissoes.filter(p => podeDelegarPermissao(p.chave));
                          if (permissoesDelegaveis.length === 0) return;

                          const novas = new Set(permissoesSelecionadas);
                          const todasDelegaveisMarcadas = permissoesDelegaveis.every(p => novas.has(p.chave));
                          if (todasDelegaveisMarcadas) {
                            permissoesDelegaveis.forEach(p => novas.delete(p.chave));
                          } else {
                            permissoesDelegaveis.forEach(p => novas.add(p.chave));
                          }
                          setPermissoesSelecionadas(novas);
                        }}
                      >
                        <span className="text-sm font-semibold text-gray-700">{label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${todasMarcadas ? 'bg-green-100 text-green-700' :
                            algumaMarcada ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-200 text-gray-500'
                          }`}>
                          {permissoes.filter(p => permissoesSelecionadas.has(p.chave)).length}/{permissoes.length}
                        </span>
                      </div>

                      {/* Checkboxes */}
                      <div className="px-4 py-2 space-y-1.5">
                        {permissoes.map(perm => {
                          const podeDelegarEsta = podeDelegarPermissao(perm.chave);
                          const bloqueadoAdmin = isAdmin && modoEdicao;
                          const desabilitado = bloqueadoAdmin || !podeDelegarEsta;

                          return (
                            <label
                              key={perm.chave}
                              className={`flex items-start space-x-2.5 py-1 ${desabilitado ? 'opacity-60' : 'cursor-pointer'}`}
                            >
                              <input
                                type="checkbox"
                                checked={bloqueadoAdmin ? true : permissoesSelecionadas.has(perm.chave)}
                                onChange={() => togglePermissao(perm.chave)}
                                disabled={desabilitado}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                              />
                              <span className="text-sm text-gray-600 leading-tight">
                                {perm.descricao}
                                {!podeDelegarEsta && !bloqueadoAdmin && ' 🔒'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
            {!(isAdmin && modoEdicao) && (
              <Button variant="primary" loading={carregando} onClick={salvarPerfil}>Salvar</Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}