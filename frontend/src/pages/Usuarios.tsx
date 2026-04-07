import { useState, useEffect, useMemo } from 'react';
import { usePermissao } from '../hooks/usePermissao';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ActionToolbar } from '../components/ActionToolbar';
import { usuarioService } from '../services/usuarioService';
import { perfilService } from '../services/perfilService';
import type { Usuario } from '../types/usuario';
import type { Perfil } from '../types/perfil';
import toast from 'react-hot-toast';

export default function Usuarios() {
  const { temPermissao } = usePermissao();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Novos controles da tela
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState<number | ''>('');
  const [senhaAutorizacao, setSenhaAutorizacao] = useState('');

  // Estados de Erro
  const [erros, setErros] = useState({
    nome: '',
    login: '',
    senha: '',
    perfilId: '',
    senhaAutorizacao: ''
  });

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
    setErros({ nome: '', login: '', senha: '', perfilId: '', senhaAutorizacao: '' });
    setModalAberto(true);
  };

  const abrirModalEditar = () => {
    if (!usuarioSelecionado) {
      toast.error("Selecione um usuário");
      return;
    }
    setModoEdicao(true);
    setNome(usuarioSelecionado.nome);
    setLogin(usuarioSelecionado.login);
    setSenha('');
    setPerfilId(usuarioSelecionado.perfil_id);
    setSenhaAutorizacao('');
    setErros({ nome: '', login: '', senha: '', perfilId: '', senhaAutorizacao: '' });
    setModalAberto(true);
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
    let novosErros = { nome: '', login: '', senha: '', perfilId: '', senhaAutorizacao: '' };
    let temErro = false;

    if (!nome.trim()) { novosErros.nome = 'Obrigatório'; temErro = true; }
    if (!login.trim()) { novosErros.login = 'Obrigatório'; temErro = true; }
    if (perfilId === '') { novosErros.perfilId = 'Selecione um perfil'; temErro = true; }
    if (!modoEdicao && !senha) { novosErros.senha = 'Obrigatório'; temErro = true; }

    if (senha && !/^\d{6}$/.test(senha)) {
      novosErros.senha = 'Deve conter 6 números';
      temErro = true;
    }

    if (modoEdicao && !senhaAutorizacao) {
      novosErros.senhaAutorizacao = 'A sua senha é necessária';
      temErro = true;
    }

    setErros(novosErros);
    if (temErro) return;

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
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await usuarioService.criar({ nome, login, senha, perfil_id: Number(perfilId), ativo: true });
        toast.success("Usuário criado com sucesso!");
      }

      setModalAberto(false);
      carregarDados();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setCarregando(false);
    }
  };

  const inativarUsuario = async (id: number, nomeUsuario: string) => {
    if (window.confirm(`Tem a certeza que deseja inativar o usuário ${nomeUsuario}? O acesso ao sistema será revogado.`)) {
      try {
        await usuarioService.inativar(id);
        toast.success("Usuário inativado com sucesso!");
        carregarDados();
      } catch (error: any) {
        toast.error(error.message || "Erro ao inativar usuário");
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
            ...(temPermissao('ACESSOS.USUARIOS') ? [
              { label: "Adicionar", onClick: abrirModalCriar },
              { label: "Editar", onClick: abrirModalEditar },
              {
                label: "Inativar",
                isDanger: true,
                onClick: () => {
                  if (!usuarioSelecionado) {
                    toast.error("Selecione um usuário");
                    return;
                  }
                  if (!usuarioSelecionado.ativo) {
                    toast.error("Este usuário já se encontra inativo");
                    return;
                  }
                  inativarUsuario(usuarioSelecionado.id, usuarioSelecionado.nome);
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

      <Modal isOpen={modalAberto}>
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Usuário' : 'Criar Usuário'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (e.target.value.trim()) setErros({...erros, nome: ''});
                }}
                error={erros.nome}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Login"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    if (e.target.value.trim()) setErros({...erros, login: ''});
                  }}
                  error={erros.login}
                />
                <Input
                  label="Senha"
                  type="password"
                  maxLength={6}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value.replace(/\D/g, ''));
                    setErros({...erros, senha: ''});
                  }}
                  error={erros.senha}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
                <select
                  value={perfilId}
                  onChange={(e) => {
                    setPerfilId(Number(e.target.value));
                    setErros({...erros, perfilId: ''});
                  }}
                  className={`w-full border p-2 rounded focus:outline-none focus:ring-2 bg-white ${erros.perfilId ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#1a63b6]'}`}
                >
                  <option value="" disabled>Selecione...</option>
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                {erros.perfilId && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{erros.perfilId}</span>}
              </div>

              {modoEdicao && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <Input
                    label="Senha atual"
                    type="password"
                    maxLength={6}
                    value={senhaAutorizacao}
                    placeholder="Digite a sua senha para confirmar"
                    onChange={(e) => {
                      setSenhaAutorizacao(e.target.value.replace(/\D/g, ''));
                      setErros({...erros, senhaAutorizacao: ''});
                    }}
                    error={erros.senhaAutorizacao}
                  />
                  {!erros.senhaAutorizacao && <p className="text-xs text-red-600 mt-1">Confirme que é você para salvar as alterações</p>}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" loading={carregando} loadingText="Salvando..." onClick={salvarUsuario}>Salvar</Button>
            </div>
          </div>
      </Modal>
    </div>
  );
}