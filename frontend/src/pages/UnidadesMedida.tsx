import { useState, useEffect, useMemo } from 'react';
import { usePermissao } from '../hooks/usePermissao';
import { ActionToolbar } from '../components/ActionToolbar';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { unidadeMedidaService } from '../services/unidadeMedidaService';
import type { UnidadeMedida } from '../types/unidadeMedida';
import toast from 'react-hot-toast';

export default function UnidadesMedida() {
  const { temPermissao } = usePermissao();
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeMedida | null>(null);
  const [termoBusca, setTermoBusca] = useState('');

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [editDecimais, setEditDecimais] = useState(false);
  const [editNatureza, setEditNatureza] = useState('Discreta');
  const [salvando, setSalvando] = useState(false);

  const carregarUnidades = async () => {
    try {
      const dados = await unidadeMedidaService.listar();
      setUnidades(dados);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      toast.error("Erro ao carregar as unidades de medida.");
    }
  };

  useEffect(() => {
    carregarUnidades();
  }, []);

  const unidadesFiltradas = useMemo(() => {
    if (!termoBusca) return unidades;
    const termo = termoBusca.toLowerCase();
    return unidades.filter(u =>
      u.sigla.toLowerCase().includes(termo) ||
      u.desc.toLowerCase().includes(termo)
    );
  }, [unidades, termoBusca]);

  const abrirModalEdicao = () => {
    if (!unidadeSelecionada) {
      toast.error("Selecione uma unidade para editar.");
      return;
    }
    setEditDecimais(unidadeSelecionada.decimais);
    setEditNatureza(unidadeSelecionada.natureza || 'Discreta');
    setModalAberto(true);
  };

  const salvarEdicao = async () => {
    if (!unidadeSelecionada) return;
    setSalvando(true);
    try {
      const sessaoStr = localStorage.getItem('wms_sessao_usuario');
      let usuarioLogado = 'sistema';
      if (sessaoStr) {
        try {
          const sessao = JSON.parse(sessaoStr);
          usuarioLogado = sessao.login || 'sistema';
        } catch (e) {
          console.error("Erro ao fazer parse da sessão:", e);
        }
      }

      const unidadeAtualizada = await unidadeMedidaService.atualizar(unidadeSelecionada.id, {
        decimais: editDecimais,
        natureza: editNatureza,
        usuario: usuarioLogado
      });
      setUnidades(unidades.map(u => u.id === unidadeSelecionada.id ? unidadeAtualizada : u));
      setUnidadeSelecionada(unidadeAtualizada);
      toast.success("Unidade de medida atualizada com sucesso!");
      setModalAberto(false);
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      toast.error("Erro ao atualizar a unidade de medida.");
    } finally {
      setSalvando(false);
    }
  };

  const sincronizarComERP = async () => {
    try {
      const sessaoStr = localStorage.getItem('wms_sessao_usuario');
      let usuarioLogado = 'sistema';
      if (sessaoStr) {
        try {
          const sessao = JSON.parse(sessaoStr);
          usuarioLogado = sessao.login || 'sistema';
        } catch (e) {
          console.error("Erro ao fazer parse da sessão:", e);
        }
      }

      const resultado = await unidadeMedidaService.sincronizarERP(usuarioLogado);
      toast.success(`Sincronização concluída! ${resultado.inseridas} novas, ${resultado.atualizadas} atualizadas.`);
      carregarUnidades();
    } catch (error: any) {
      toast.error(error.message || "Erro ao sincronizar com o ERP");
    } finally {
      // Finalizado
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          acoes={[
            ...(temPermissao('CADASTROS.UNIDADES_MEDIDA') ? [
              {
                label: "Editar",
                onClick: abrirModalEdicao,
                className: !unidadeSelecionada ? "opacity-50 cursor-not-allowed" : ""
              },
              {
                label: "Sincronizar",
                onClick: sincronizarComERP
              }
            ] : [])
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-24 text-center">Sigla</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Descrição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Natureza</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Decimais</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Nenhuma unidade encontrada.
                  </td>
                </tr>
              ) : (
                unidadesFiltradas.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setUnidadeSelecionada(u)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${unidadeSelecionada?.id === u.id ? "bg-blue-100" : ""}`}
                  >
                    <td className="px-4 py-2 font-bold text-blue-900 text-center">{u.sigla}</td>
                    <td className="px-4 py-2 font-medium">{u.desc}</td>
                    <td className="px-4 py-2 text-center text-xs font-semibold uppercase">
                      <span className={`px-2 py-1 rounded bg-gray-100 ${
                        u.natureza === 'Peso' ? 'text-green-700 bg-green-50' : 
                        u.natureza === 'Discreta' ? 'text-blue-700 bg-blue-50' : 
                        u.natureza === 'Área' ? 'text-purple-700 bg-purple-50' :
                        'text-orange-700 bg-orange-50'
                      }`}>
                        {u.natureza || 'Discreta'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center font-bold">
                      {u.decimais ? <span className="text-green-600">Sim</span> : <span className="text-gray-400">Não</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      <Modal isOpen={modalAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-wms-sidebar">Editar Unidade</h3>
            <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>

          <div className="space-y-5 mb-8">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Permitir Decimais?</span>
              <label className="inline-flex items-center cursor-pointer relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={editDecimais}
                  onChange={(e) => setEditDecimais(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a63b6]"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Natureza</label>
              <select
                value={editNatureza}
                onChange={(e) => setEditNatureza(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm bg-gray-50"
              >
                <option value="Discreta">Discreta</option>
                <option value="Peso">Peso</option>
                <option value="Largura">Largura</option>
                <option value="Comprimento">Comprimento</option>
                <option value="Área">Área</option>
              </select>
              <p className="mt-2 text-[10px] text-gray-400 italic">Determina o tipo de mensuração do produto.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button variant="primary" loading={salvando} onClick={salvarEdicao}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}