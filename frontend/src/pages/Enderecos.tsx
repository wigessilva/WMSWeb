import { useState, useEffect, useMemo, useRef } from 'react';
import { usePermissao } from '../hooks/usePermissao';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ActionToolbar } from '../components/ActionToolbar';
import { TableFilter } from '../components/TableFilter';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { enderecoService } from '../services/enderecoService';
import type { Endereco, Area, EstruturaFisica, FinalidadeEndereco, ProdutoSimples } from '../types/endereco';
import toast from 'react-hot-toast';
import { useTableFilter, type FilterConfig } from '../hooks/useTableFilter';

export default function Enderecos() {
  const { temPermissao } = usePermissao();
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [estruturas, setEstruturas] = useState<EstruturaFisica[]>([]);
  const [finalidades, setFinalidades] = useState<FinalidadeEndereco[]>([]);
  const [produtos, setProdutos] = useState<ProdutoSimples[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState<Endereco | null>(null);
  const [termoBusca, setTermoBusca] = useState('');

  // Modais
  const [modalGerar, setModalGerar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalMotivo, setModalMotivo] = useState(false);
  const [modoModalMotivo, setModoModalMotivo] = useState<'lote' | 'edicao'>('edicao');

  // Lote
  const [loteAreaId, setLoteAreaId] = useState(0);
  const [loteRuaI, setLoteRuaI] = useState(1); const [loteRuaF, setLoteRuaF] = useState(1);
  const [lotePredI, setLotePredI] = useState(1); const [lotePredF, setLotePredF] = useState(1);
  const [loteNivI, setLoteNivI] = useState(1); const [loteNivF, setLoteNivF] = useState(1);
  const [lotePosI, setLotePosI] = useState(1); const [lotePosF, setLotePosF] = useState(1);
  const [loteEstId, setLoteEstId] = useState(0);
  const [loteFinId, setLoteFinId] = useState(0);
  const [lotePeso, setLotePeso] = useState(1000);
  const [loteProdId, setLoteProdId] = useState<number | null>(null);
  const [loteCap, setLoteCap] = useState<number | null>(null);
  const [loteAtivo, setLoteAtivo] = useState(true);
  const [loteBloqueado, setLoteBloqueado] = useState(false);
  const [loteMotivo, setLoteMotivo] = useState('');

  // Edição
  const [editEstId, setEditEstId] = useState(0);
  const [editFinId, setEditFinId] = useState(0);
  const [editPeso, setEditPeso] = useState(0);
  const [editProdId, setEditProdId] = useState<number | null>(null);
  const [editCap, setEditCap] = useState<number | null>(null);
  const [editAtivo, setEditAtivo] = useState(true);
  const [editBloqueado, setEditBloqueado] = useState(false);
  const [editMotivo, setEditMotivo] = useState('');

  const qtdPreview = useMemo(() => {
    return Math.max(0, loteRuaF - loteRuaI + 1) * Math.max(0, lotePredF - lotePredI + 1) *
      Math.max(0, loteNivF - loteNivI + 1) * Math.max(0, lotePosF - lotePosI + 1);
  }, [loteRuaI, loteRuaF, lotePredI, lotePredF, loteNivI, loteNivF, lotePosI, lotePosF]);

  const filterConfigs: FilterConfig[] = useMemo(() => {
    const mk = (key: string, label: string) => {
      const vals = [...new Set(enderecos.map((e: any) => e[key]).filter(Boolean))];
      return { key, label, type: 'select' as const, options: vals.map(v => ({ value: v, label: v })) };
    };
    return [
      mk('area_letra', 'Área'), mk('estrutura_nome', 'Estrutura'), mk('finalidade_nome', 'Finalidade'),
      { key: 'ativo', label: 'Status', type: 'boolean' as const, booleanLabels: { true: 'Ativo', false: 'Inativo' } },
      { key: 'bloqueado', label: 'Bloqueio', type: 'boolean' as const, booleanLabels: { true: 'Bloqueado', false: 'Livre' } },
    ];
  }, [enderecos]);

  const tableFilter = useTableFilter(enderecos, filterConfigs);

  const filtrados = useMemo(() => {
    if (!termoBusca) return tableFilter.filteredData;
    const t = termoBusca.toLowerCase();
    return tableFilter.filteredData.filter(e =>
      e.codigo_formatado.toLowerCase().includes(t) || (e.produto_descricao?.toLowerCase().includes(t))
    );
  }, [tableFilter.filteredData, termoBusca]);

  const carregarDados = async () => {
    try {
      const [ends, ars, ests, fins, prods] = await Promise.all([
        enderecoService.listar(), enderecoService.listarAreas(), enderecoService.listarEstruturas(),
        enderecoService.listarFinalidades(), enderecoService.listarProdutos(),
      ]);
      setEnderecos(ends); setAreas(ars); setEstruturas(ests); setFinalidades(fins); setProdutos(prods);
    } catch (err) { console.error("Erro ao carregar dados:", err); }
  };

  useEffect(() => { carregarDados(); }, []);

  const abrirGerar = () => {
    if (areas.length) setLoteAreaId(areas[0].id);
    if (estruturas.length) setLoteEstId(estruturas[0].id);
    if (finalidades.length) setLoteFinId(finalidades[0].id);
    setLoteRuaI(1); setLoteRuaF(1); setLotePredI(1); setLotePredF(1);
    setLoteNivI(1); setLoteNivF(1); setLotePosI(1); setLotePosF(1);
    setLotePeso(1000); setLoteProdId(null); setLoteCap(null);
    setLoteAtivo(true); setLoteBloqueado(false); setLoteMotivo('');
    setModalGerar(true);
  };

  const abrirEditar = () => {
    if (!selecionado) { toast.error("Selecione um endereço"); return; }
    setEditEstId(selecionado.estrutura_fisica_id);
    setEditFinId(selecionado.finalidade_id);
    setEditPeso(selecionado.peso_maximo_kg);
    setEditProdId(selecionado.produto_id);
    setEditCap(selecionado.capacidade_maxima_und);
    setEditAtivo(selecionado.ativo);
    setEditBloqueado(selecionado.bloqueado);
    setEditMotivo(selecionado.motivo_bloqueio || '');
    setModalEditar(true);
  };

  const salvarGerar = async () => {
    if (!loteAreaId || !loteEstId || !loteFinId) { toast.error("Preencha Área, Estrutura e Finalidade."); return; }
    setCarregando(true);
    try {
      const res = await enderecoService.gerarLote({
        area_id: loteAreaId, rua_inicio: loteRuaI, rua_fim: loteRuaF,
        predio_inicio: lotePredI, predio_fim: lotePredF, nivel_inicio: loteNivI, nivel_fim: loteNivF,
        posicao_inicio: lotePosI, posicao_fim: lotePosF, estrutura_fisica_id: loteEstId,
        finalidade_id: loteFinId, peso_maximo_kg: lotePeso, produto_id: loteProdId, capacidade_maxima_und: loteCap,
        ativo: loteAtivo, bloqueado: loteBloqueado, motivo_bloqueio: loteBloqueado ? loteMotivo : null,
      });
      toast.success(res.mensagem); setModalGerar(false); carregarDados();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao gerar."); }
    finally { setCarregando(false); }
  };

  const salvarEdicao = async () => {
    if (!selecionado) return;
    setCarregando(true);
    try {
      await enderecoService.atualizar(selecionado.id, {
        estrutura_fisica_id: editEstId, finalidade_id: editFinId, peso_maximo_kg: editPeso,
        produto_id: editProdId, capacidade_maxima_und: editCap,
        ativo: editAtivo, bloqueado: editBloqueado,
        motivo_bloqueio: editBloqueado ? editMotivo : null,
        rowversion: selecionado.rowversion,
      });
      toast.success("Endereço atualizado!"); setModalEditar(false); setSelecionado(null); carregarDados();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao atualizar."); }
    finally { setCarregando(false); }
  };

  const excluir = async () => {
    if (!selecionado) { toast.error("Selecione um endereço"); return; }
    if (!window.confirm(`Excluir ${selecionado.codigo_formatado}?`)) return;
    try { await enderecoService.excluir(selecionado.id); toast.success("Excluído!"); setSelecionado(null); carregarDados(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao excluir."); }
  };

  const Sel = ({ label, value, onChange, options }: { label: string; value: number; onChange: (v: number) => void; options: { id: number; label: string }[] }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm">
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  const Range = ({ label, i, f, si, sf }: { label: string; i: number; f: number; si: (v: number) => void; sf: (v: number) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center space-x-2">
        <input type="number" min={1} value={i} onChange={e => si(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm" />
        <span className="text-gray-400 text-sm font-medium">até</span>
        <input type="number" min={1} value={f} onChange={e => sf(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm" />
      </div>
    </div>
  );

  const ProdutoAutocomplete = ({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) => {
    const [termo, setTermo] = useState('');
    const [aberto, setAberto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const prodSelecionado = value ? produtos.find(p => p.id === value) : null;

    useEffect(() => {
      const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtrados = termo.length >= 3 ? produtos.filter(p =>
      p.sku.toLowerCase().includes(termo.toLowerCase()) || p.descricao.toLowerCase().includes(termo.toLowerCase())
    ).slice(0, 10) : [];

    return (
      <div ref={ref}>
        <label className="block text-sm font-medium text-gray-700 mb-1">Produto fixo</label>
        {prodSelecionado ? (
          <div className="flex items-center justify-between border border-blue-300 bg-blue-50 p-2 rounded text-sm">
            <span className="font-medium text-blue-900">{prodSelecionado.sku} — {prodSelecionado.descricao}</span>
            <button type="button" onClick={() => { onChange(null); setTermo(''); }} className="text-red-500 hover:text-red-700 font-bold ml-2">&times;</button>
          </div>
        ) : (
          <div className="relative">
            <input type="text" value={termo} onChange={e => { setTermo(e.target.value); setAberto(true); }}
              onFocus={() => { if (termo.length >= 3) setAberto(true); }}
              placeholder="Digite 3 letras para buscar..."
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm" />
            {aberto && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                {termo.length < 3 ? (
                  <div className="p-3 text-sm text-gray-400 text-center">Digite 3 letras para buscar...</div>
                ) : filtrados.length > 0 ? (
                  filtrados.map(p => (
                    <button key={p.id} type="button" onClick={() => { onChange(p.id); setTermo(''); setAberto(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100">
                      <span className="font-bold text-blue-900">{p.sku}</span> <span className="text-gray-600">— {p.descricao}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 text-center">Nenhum produto encontrado.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar termoBusca={termoBusca} onBuscaChange={setTermoBusca} placeholderBusca="Buscar código ou produto"
          acoes={[...(temPermissao('CADASTROS.ENDERECOS') ? [
            { label: "Gerar", onClick: abrirGerar, className: "text-green-700 hover:bg-green-50 font-medium" },
            { label: "Editar", onClick: abrirEditar },
            { label: "Excluir", isDanger: true, onClick: excluir },
          ] : [])]}>
          <TableFilter filter={tableFilter} />
        </ActionToolbar>

        <div className="overflow-x-auto border border-gray-200 rounded" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm sticky top-0 z-[1]">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Código</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Área</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Rua</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Prédio</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Nível</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Posição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Estrutura</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Finalidade</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-right">Peso Máx.</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Produto Fixo</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {filtrados.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">Nenhum endereço encontrado.</td></tr>
              ) : filtrados.map(e => (
                <tr key={e.id} onClick={() => setSelecionado(e)}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selecionado?.id === e.id ? "bg-blue-100" : ""}`}>
                  <td className="px-4 py-2 font-semibold text-blue-900 font-mono">{e.codigo_formatado}</td>
                  <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-semibold">{e.area_letra}</span></td>
                  <td className="px-4 py-2 text-center">{String(e.rua).padStart(2, '0')}</td>
                  <td className="px-4 py-2 text-center">{String(e.predio).padStart(2, '0')}</td>
                  <td className="px-4 py-2 text-center">{String(e.nivel).padStart(2, '0')}</td>
                  <td className="px-4 py-2 text-center">{String(e.posicao).padStart(2, '0')}</td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-xs font-semibold">{e.estrutura_nome}</span></td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.finalidade_nome?.toLowerCase().includes('picking') ? 'bg-amber-100 text-amber-800' :
                    e.finalidade_nome?.toLowerCase().includes('quarentena') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>{e.finalidade_nome}</span></td>
                  <td className="px-4 py-2 text-right font-mono">{e.peso_maximo_kg.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2">{e.produto_descricao ? <span className="text-xs text-purple-700 font-medium">{e.produto_descricao}</span> : <span className="text-xs text-gray-400">Dinâmico</span>}</td>
                  <td className="px-4 py-2 text-center flex items-center justify-center space-x-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{e.ativo ? 'Ativo' : 'Inativo'}</span>
                    {e.bloqueado && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">BLOQUEADO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GERAR */}
      <Modal isOpen={modalGerar} fundoTransparente={modalMotivo && modoModalMotivo === 'lote'}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">

            {/* Controle de Status Inicial */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between flex-1 w-full">
                <span className="text-sm font-medium text-gray-700 mr-3">Status</span>
                <ToggleSwitch checked={loteAtivo} onChange={setLoteAtivo} />
              </div>
              <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
              <div className="flex-1 w-full">
                <button type="button" onClick={() => {
                  if (loteBloqueado) { setLoteBloqueado(false); setLoteMotivo(''); }
                  else { setModoModalMotivo('lote'); setModalMotivo(true); }
                }} className={`w-full px-4 py-2 text-sm font-medium rounded transition-colors border ${loteBloqueado ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {loteBloqueado ? "Bloqueado por Padrão" : "Bloquear"}
                </button>
              </div>
            </div>

            <Sel label="Área" value={loteAreaId} onChange={setLoteAreaId} options={areas.map(a => ({ id: a.id, label: `${a.letra} — ${a.descricao}` }))} />

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Intervalos de Geração</p>
              <div className="grid grid-cols-2 gap-3">
                <Range label="Rua" i={loteRuaI} f={loteRuaF} si={setLoteRuaI} sf={setLoteRuaF} />
                <Range label="Prédio" i={lotePredI} f={lotePredF} si={setLotePredI} sf={setLotePredF} />
                <Range label="Nível" i={loteNivI} f={loteNivF} si={setLoteNivI} sf={setLoteNivF} />
                <Range label="Posição" i={lotePosI} f={lotePosF} si={setLotePosI} sf={setLotePosF} />
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Características</p>
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Estrutura Física" value={loteEstId} onChange={setLoteEstId} options={estruturas.map(e => ({ id: e.id, label: e.nome }))} />
                <Sel label="Finalidade" value={loteFinId} onChange={setLoteFinId} options={finalidades.map(f => ({ id: f.id, label: f.nome }))} />
              </div>
              <div className="mt-3"><Input label="Peso Máximo (kg)" type="number" value={lotePeso} onChange={e => setLotePeso(Number(e.target.value))} /></div>
              <div className="mt-3"><ProdutoAutocomplete value={loteProdId} onChange={setLoteProdId} /></div>
              {loteProdId && <div className="mt-3"><Input label="Capacidade Máxima (und)" type="number" value={loteCap ?? ''} onChange={e => setLoteCap(e.target.value ? Number(e.target.value) : null)} /></div>}
            </div>
            <div className={`p-3 rounded-lg text-center font-medium text-sm ${qtdPreview > 500 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
              {qtdPreview > 0 ? <>{qtdPreview === 1 ? 'Será gerada' : 'Serão geradas'} <span className="font-bold text-lg">{qtdPreview.toLocaleString('pt-BR')}</span> {qtdPreview === 1 ? 'posição' : 'posições'}</> : <span className="text-red-600">Intervalos inválidos.</span>}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setModalGerar(false)}>Cancelar</Button>
            <Button variant="primary" loading={carregando} loadingText="Gerando..." onClick={salvarGerar} disabled={qtdPreview <= 0}>Gerar</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal isOpen={modalEditar} fundoTransparente={modalMotivo && modoModalMotivo === 'edicao'}>
        {selecionado && (
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">Editar Endereço</h3>
              <button onClick={() => setModalEditar(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                <span className="text-xs text-gray-500 block mb-1">Endereço</span>
                <span className="text-lg font-bold text-blue-900 font-mono">{selecionado.codigo_formatado}</span>
              </div>

              {/* Toggle Ativo + Botão Bloqueio */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between flex-1 w-full">
                  <span className="text-sm font-medium text-gray-700 mr-3">Status</span>
                  <ToggleSwitch checked={editAtivo} onChange={setEditAtivo} />
                </div>
                <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
                <div className="flex-1 w-full">
                  <button type="button" onClick={() => {
                    if (editBloqueado) { setEditBloqueado(false); setEditMotivo(''); }
                    else { setModoModalMotivo('edicao'); setModalMotivo(true); }
                  }} className={`w-full px-4 py-2 text-sm font-medium rounded transition-colors border ${editBloqueado ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    {editBloqueado ? "Desbloquear Endereço" : "Bloquear Endereço"}
                  </button>
                </div>
              </div>

              <Sel label="Estrutura Física" value={editEstId} onChange={setEditEstId} options={estruturas.map(e => ({ id: e.id, label: e.nome }))} />
              <Sel label="Finalidade" value={editFinId} onChange={setEditFinId} options={finalidades.map(f => ({ id: f.id, label: f.nome }))} />
              <Input label="Peso Máximo (kg)" type="number" value={editPeso} onChange={e => setEditPeso(Number(e.target.value))} />

              <ProdutoAutocomplete value={editProdId} onChange={setEditProdId} />
              {editProdId && <div className="mt-3"><Input label="Capacidade Máxima (und)" type="number" value={editCap ?? ''} onChange={e => setEditCap(e.target.value ? Number(e.target.value) : null)} /></div>}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setModalEditar(false)}>Cancelar</Button>
              <Button variant="primary" loading={carregando} onClick={salvarEdicao}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL MOTIVO BLOQUEIO */}
      <Modal isOpen={modalMotivo} zIndexClass="z-[1010]">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Motivo do Bloqueio</h3>
          <textarea
            value={modoModalMotivo === 'lote' ? loteMotivo : editMotivo}
            onChange={e => modoModalMotivo === 'lote' ? setLoteMotivo(e.target.value) : setEditMotivo(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] mb-4"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => {
              setModalMotivo(false);
              if (modoModalMotivo === 'lote') setLoteMotivo(''); else setEditMotivo('');
            }}>Cancelar</Button>
            <Button variant="danger"
              disabled={modoModalMotivo === 'lote' ? !loteMotivo.trim() : !editMotivo.trim()}
              onClick={() => {
                if (modoModalMotivo === 'lote') setLoteBloqueado(true); else setEditBloqueado(true);
                setModalMotivo(false);
              }}>Confirmar Bloqueio</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
