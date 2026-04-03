import { useState, useEffect, useMemo } from 'react';
import { unidadeMedidaService } from '../services/unidadeMedidaService';
import type { UnidadeMedida } from '../types/unidadeMedida';
import toast from 'react-hot-toast';

export default function UnidadesMedida() {
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

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

  const alternarDecimais = async (id: number, valorAtual: boolean) => {
    // Atualização otimista: muda na tela antes mesmo da API responder para parecer instantâneo
    setUnidades(unidades.map(u => u.id === id ? { ...u, decimais: !valorAtual } : u));

    try {
      await unidadeMedidaService.atualizarDecimais(id, !valorAtual);
      toast.success("Configuração salva!");
    } catch (error) {
      // Se der erro no backend, desfaz a alteração na tela
      setUnidades(unidades.map(u => u.id === id ? { ...u, decimais: valorAtual } : u));
      toast.error("Erro ao atualizar a configuração.");
    }
  };

  const sincronizarComERP = async () => {
    setCarregando(true);
    try {
      // Esta chamada vai bater no backend, que vai ler o SQL Server (ERP_DB)
      // e gravar no PostgreSQL do WMS
      const resultado = await unidadeMedidaService.sincronizarERP();

      toast.success(`Sincronização concluída! ${resultado.inseridas} novas, ${resultado.atualizadas} atualizadas.`);
      carregarUnidades();
    } catch (error: any) {
      toast.error(error.message || "Erro ao sincronizar com o ERP");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-4">
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

          <div>
            <button
              onClick={sincronizarComERP}
              disabled={carregando}
              className="bg-[#1a63b6] text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm disabled:opacity-50"
            >
              {carregando ? 'Sincronizando...' : '↻ Sincronizar'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 w-24 text-center">Sigla</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Descrição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Decimais</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-right">Última Atualização</th>
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
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-bold text-blue-900 text-center bg-blue-50">{u.sigla}</td>
                    <td className="px-4 py-2 font-medium">{u.desc}</td>
                    <td className="px-4 py-2 text-center relative">
                      <label className="inline-flex items-center cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={u.decimais}
                          onChange={() => alternarDecimais(u.id, u.decimais)}
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a63b6]"></div>
                      </label>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400">
                      {new Date(u.atualizado_em).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}