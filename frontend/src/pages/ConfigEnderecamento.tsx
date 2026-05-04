import { useState, useEffect } from 'react';
import { enderecoService } from '../services/enderecoService';
import type { Area, EstruturaFisica, FinalidadeEndereco } from '../types/endereco';
import { ToggleSwitch } from '../components/ToggleSwitch';
import toast from 'react-hot-toast';

type Aba = 'areas' | 'estruturas' | 'finalidades';

export default function ConfigEnderecamento() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('areas');

  // --- ÁREAS ---
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaLetra, setAreaLetra] = useState('');
  const [areaDesc, setAreaDesc] = useState('');

  // --- ESTRUTURAS ---
  const [estruturas, setEstruturas] = useState<EstruturaFisica[]>([]);
  const [estNome, setEstNome] = useState('');
  const [estPalete, setEstPalete] = useState(false);
  const [estCaixa, setEstCaixa] = useState(false);
  const [estLog, setEstLog] = useState(false);

  // --- FINALIDADES ---
  const [finalidades, setFinalidades] = useState<FinalidadeEndereco[]>([]);
  const [finNome, setFinNome] = useState('');
  const [finPulmao, setFinPulmao] = useState(false);
  const [finPicking, setFinPicking] = useState(false);
  const [finQuarentena, setFinQuarentena] = useState(false);

  const carregarDados = async () => {
    try {
      const [ars, ests, fins] = await Promise.all([
        enderecoService.listarAreas(),
        enderecoService.listarEstruturas(),
        enderecoService.listarFinalidades(),
      ]);
      setAreas(ars);
      setEstruturas(ests);
      setFinalidades(fins);
    } catch { console.error("Erro ao carregar dados."); }
  };

  useEffect(() => { carregarDados(); }, []);

  // Pega o filial_id da URL do servidor (localStorage), já que cada servidor = 1 filial
  const getFilialId = (): number => {
    const sessao = localStorage.getItem('wms_sessao_usuario');
    if (sessao) {
      const usuario = JSON.parse(sessao);
      const urlAtual = localStorage.getItem('wms_api_url') || '';
      const filial = usuario.filiais?.find((f: any) => f.url_api === urlAtual);
      if (filial) return filial.id;
    }
    return 1;
  };

  // --- HANDLERS ---
  const criarArea = async () => {
    if (!areaLetra.trim() || !areaDesc.trim()) { toast.error("Preencha a letra e a descrição."); return; }
    try {
      await enderecoService.criarArea({ letra: areaLetra.toUpperCase(), descricao: areaDesc, filial_id: getFilialId() });
      toast.success("Área criada!"); setAreaLetra(''); setAreaDesc(''); carregarDados();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao criar área."); }
  };

  const excluirArea = async (id: number, letra: string) => {
    if (!window.confirm(`Excluir a área "${letra}"?`)) return;
    try { await enderecoService.excluirArea(id); toast.success("Excluída!"); carregarDados(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao excluir."); }
  };

  const criarEstrutura = async () => {
    if (!estNome.trim()) { toast.error("Preencha o nome."); return; }
    try {
      await enderecoService.criarEstrutura({ nome: estNome, comporta_palete: estPalete, comporta_caixa: estCaixa, comporta_log: estLog });
      toast.success("Estrutura criada!"); setEstNome(''); setEstPalete(false); setEstCaixa(false); setEstLog(false); carregarDados();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao criar."); }
  };

  const excluirEstrutura = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir "${nome}"?`)) return;
    try { await enderecoService.excluirEstrutura(id); toast.success("Excluída!"); carregarDados(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao excluir."); }
  };

  const criarFinalidade = async () => {
    if (!finNome.trim()) { toast.error("Preencha o nome."); return; }
    try {
      await enderecoService.criarFinalidade({ nome: finNome, tipo_pulmao: finPulmao, tipo_picking: finPicking, tipo_quarentena: finQuarentena });
      toast.success("Finalidade criada!"); setFinNome(''); setFinPulmao(false); setFinPicking(false); setFinQuarentena(false); carregarDados();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao criar."); }
  };

  const excluirFinalidade = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir "${nome}"?`)) return;
    try { await enderecoService.excluirFinalidade(id); toast.success("Excluída!"); carregarDados(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao excluir."); }
  };

  const abas: { key: Aba; label: string }[] = [
    { key: 'areas', label: 'Áreas' },
    { key: 'estruturas', label: 'Estruturas Físicas' },
    { key: 'finalidades', label: 'Finalidades' },
  ];

  const Badge = ({ ativo, label }: { ativo: boolean; label: string }) => (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ativo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{label}</span>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {/* ABAS */}
        <div className="flex border-b border-gray-200">
          {abas.map(aba => (
            <button
              key={aba.key}
              onClick={() => setAbaAtiva(aba.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                abaAtiva === aba.key
                  ? 'border-[#1a63b6] text-[#1a63b6] bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* ==================== ABA: ÁREAS ==================== */}
          {abaAtiva === 'areas' && (
            <div className="space-y-4">
              {/* Formulário de adição inline */}
              <div className="flex items-end gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Letra</label>
                  <input type="text" maxLength={5} value={areaLetra} onChange={e => setAreaLetra(e.target.value.toUpperCase())}
                    placeholder="Ex: A" className="w-20 border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-center font-bold uppercase" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                  <input type="text" value={areaDesc} onChange={e => setAreaDesc(e.target.value)}
                    placeholder="Ex: Mezanino Bloco 1" className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                </div>
                <button onClick={criarArea} className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors shadow-sm whitespace-nowrap">
                  Adicionar
                </button>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-20">Letra</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200">Descrição</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm">
                    {areas.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">Nenhuma área cadastrada.</td></tr>
                    ) : areas.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-center">
                          <span className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 text-sm font-bold">{a.letra}</span>
                        </td>
                        <td className="px-4 py-2">{a.descricao}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => excluirArea(a.id, a.letra)} className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== ABA: ESTRUTURAS FÍSICAS ==================== */}
          {abaAtiva === 'estruturas' && (
            <div className="space-y-4">
              <div className="flex items-end gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input type="text" value={estNome} onChange={e => setEstNome(e.target.value)}
                    placeholder="Ex: Porta-Palete Convencional" className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                </div>
                <div className="flex items-center gap-4 pb-0.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={estPalete} onChange={setEstPalete} /> Palete
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={estCaixa} onChange={setEstCaixa} /> Caixa
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={estLog} onChange={setEstLog} /> Log
                  </label>
                </div>
                <button onClick={criarEstrutura} className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors shadow-sm whitespace-nowrap">
                  Adicionar
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Palete</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Caixa</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Log</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm">
                    {estruturas.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhuma estrutura cadastrada.</td></tr>
                    ) : estruturas.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-medium">
                          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-xs font-semibold">{e.nome}</span>
                        </td>
                        <td className="px-4 py-2 text-center"><Badge ativo={e.comporta_palete} label={e.comporta_palete ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center"><Badge ativo={e.comporta_caixa} label={e.comporta_caixa ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center"><Badge ativo={e.comporta_log} label={e.comporta_log ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => excluirEstrutura(e.id, e.nome)} className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== ABA: FINALIDADES ==================== */}
          {abaAtiva === 'finalidades' && (
            <div className="space-y-4">
              <div className="flex items-end gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input type="text" value={finNome} onChange={e => setFinNome(e.target.value)}
                    placeholder="Ex: Pulmão Convencional" className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]" />
                </div>
                <div className="flex items-center gap-4 pb-0.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={finPulmao} onChange={setFinPulmao} /> Pulmão
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={finPicking} onChange={setFinPicking} /> Picking
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <ToggleSwitch checked={finQuarentena} onChange={setFinQuarentena} /> Quarentena
                  </label>
                </div>
                <button onClick={criarFinalidade} className="px-4 py-2 text-sm font-medium text-white bg-[#1a63b6] hover:bg-blue-800 rounded transition-colors shadow-sm whitespace-nowrap">
                  Adicionar
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Pulmão</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Picking</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Quarentena</th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm">
                    {finalidades.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhuma finalidade cadastrada.</td></tr>
                    ) : finalidades.map(f => (
                      <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-medium">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            f.tipo_picking ? 'bg-amber-100 text-amber-800' :
                            f.tipo_quarentena ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>{f.nome}</span>
                        </td>
                        <td className="px-4 py-2 text-center"><Badge ativo={f.tipo_pulmao} label={f.tipo_pulmao ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center"><Badge ativo={f.tipo_picking} label={f.tipo_picking ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center"><Badge ativo={f.tipo_quarentena} label={f.tipo_quarentena ? 'Sim' : 'Não'} /></td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => excluirFinalidade(f.id, f.nome)} className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
