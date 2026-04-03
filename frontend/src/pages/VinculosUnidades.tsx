import { useState, useEffect, useMemo } from 'react';
import { vinculoUnidadeService } from '../services/vinculoUnidadeService';
import { unidadeMedidaService } from '../services/unidadeMedidaService';
import type { VinculoUnidade } from '../types/vinculoUnidade';
import type { UnidadeMedida } from '../types/unidadeMedida';
import toast from 'react-hot-toast';

export default function VinculosUnidades() {
  const [vinculos, setVinculos] = useState<VinculoUnidade[]>([]);
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Controles de tela
  const [termoBusca, setTermoBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [vinculoSelecionado, setVinculoSelecionado] = useState<VinculoUnidade | null>(null);

  // Campos do formulário
  const [unidadeExterna, setUnidadeExterna] = useState('');
  const [unidadeMedidaId, setUnidadeMedidaId] = useState<number | ''>('');

  // Estados de Erro
  const [erros, setErros] = useState({ unidadeExterna: '', unidadeMedidaId: '' });

  const carregarDados = async () => {
    try {
      const [dadosVinculos, dadosUnidades] = await Promise.all([
        vinculoUnidadeService.listar(),
        unidadeMedidaService.listar()
      ]);
      setVinculos(dadosVinculos);
      setUnidades(dadosUnidades);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar os dados. Verifique a ligação ao servidor.");
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const getSiglaUnidade = (id: number) => {
    const unidade = unidades.find(u => u.id === id);
    return unidade ? unidade.sigla : "Desconhecida";
  };

  const vinculosFiltrados = useMemo(() => {
    if (!termoBusca) return vinculos;
    const termo = termoBusca.toLowerCase();
    return vinculos.filter(v =>
      v.unidade_externa.toLowerCase().includes(termo) ||
      getSiglaUnidade(v.unidade_medida_id).toLowerCase().includes(termo)
    );
  }, [vinculos, termoBusca, unidades]);

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setUnidadeExterna('');
    setUnidadeMedidaId('');
    setErros({ unidadeExterna: '', unidadeMedidaId: '' });
    setModalAberto(true);
    setDropdownAberto(false);
  };

  const abrirModalEditar = () => {
    if (!vinculoSelecionado) {
      toast.error("Selecione um vínculo na tabela.");
      return;
    }
    setModoEdicao(true);
    setUnidadeExterna(vinculoSelecionado.unidade_externa);
    setUnidadeMedidaId(vinculoSelecionado.unidade_medida_id);
    setErros({ unidadeExterna: '', unidadeMedidaId: '' });
    setModalAberto(true);
    setDropdownAberto(false);
  };

  const salvarVinculo = async () => {
    let novosErros = { unidadeExterna: '', unidadeMedidaId: '' };
    let temErro = false;

    if (!unidadeExterna.trim()) { novosErros.unidadeExterna = 'Obrigatório'; temErro = true; }
    if (unidadeMedidaId === '') { novosErros.unidadeMedidaId = 'Selecione a unidade interna'; temErro = true; }

    setErros(novosErros);
    if (temErro) return;

    setCarregando(true);
    const payload = {
      unidade_externa: unidadeExterna.toUpperCase().trim(),
      unidade_medida_id: Number(unidadeMedidaId)
    };

    try {
      if (modoEdicao && vinculoSelecionado) {
        await vinculoUnidadeService.atualizar(vinculoSelecionado.id, payload);
        toast.success("Vínculo atualizado com sucesso!");
      } else {
        await vinculoUnidadeService.criar(payload);
        toast.success("Vínculo criado com sucesso!");
      }
      setModalAberto(false);
      carregarDados();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar vínculo");
    } finally {
      setCarregando(false);
    }
  };

  const excluirVinculo = async (id: number, externa: string, interna: string) => {
    if (window.confirm(`Tem a certeza que deseja excluir o vínculo de ${externa} para ${interna}?`)) {
      try {
        await vinculoUnidadeService.excluir(id);
        toast.success("Vínculo excluído com sucesso!");
        carregarDados();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir vínculo.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* O CARD DIRETO, SEM TÍTULO DE PÁGINA */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">

          <div className="flex w-1/6 min-w-[125px]">
            <input
              type="text"
              placeholder="Buscar"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
            />
          </div>

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
                    if (!vinculoSelecionado) {
                      toast.error("Selecione um vínculo");
                      return;
                    }
                    excluirVinculo(vinculoSelecionado.id, vinculoSelecionado.unidade_externa, getSiglaUnidade(vinculoSelecionado.unidade_medida_id));
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
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Unidade Externa</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Unidade Interna</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {vinculosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                    Nenhum vínculo encontrado.
                  </td>
                </tr>
              ) : (
                vinculosFiltrados.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setVinculoSelecionado(v)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      vinculoSelecionado?.id === v.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-bold text-gray-800">{v.unidade_externa}</td>
                    <td className="px-4 py-2 font-bold text-[#1a63b6]">{getSiglaUnidade(v.unidade_medida_id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Vínculo' : 'Criar Vínculo'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Externa (Ex: ROL)</label>
                <input
                  type="text"
                  value={unidadeExterna}
                  onChange={(e) => {
                    setUnidadeExterna(e.target.value.toUpperCase());
                    if (e.target.value.trim()) setErros({...erros, unidadeExterna: ''});
                  }}
                  className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${erros.unidadeExterna ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#1a63b6]'}`}
                />
                {erros.unidadeExterna && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{erros.unidadeExterna}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Interna (Ex: RL)</label>
                <select
                  value={unidadeMedidaId}
                  onChange={(e) => {
                    setUnidadeMedidaId(Number(e.target.value));
                    setErros({...erros, unidadeMedidaId: ''});
                  }}
                  className={`w-full border p-2 rounded focus:outline-none focus:ring-2 bg-white ${erros.unidadeMedidaId ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#1a63b6]'}`}
                >
                  <option value="" disabled>Selecione...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.sigla} - {u.desc}</option>
                  ))}
                </select>
                {erros.unidadeMedidaId && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{erros.unidadeMedidaId}</span>}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors">Cancelar</button>
              <button
                onClick={salvarVinculo}
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