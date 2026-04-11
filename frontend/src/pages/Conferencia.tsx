import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recebimentoService } from '../services/recebimentoService';
import { uaService } from '../services/uaService';
import { produtoService } from '../services/produtoService';
import { Button } from '../components/Button';
import { toast } from 'react-hot-toast';
import type { Recebimento } from '../types/recebimento';
import type { UA } from '../types/ua';

type Step = 'BIPAR_UA' | 'CONFERENCIA';

export default function Conferencia() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inputUARef = useRef<HTMLInputElement>(null);

  // Estados Globais da Conferência
  const [recebimento, setRecebimento] = useState<Recebimento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [step, setStep] = useState<Step>('BIPAR_UA');

  // Estados de Navegação
  const [itemAtualIndex, setItemAtualIndex] = useState(0);
  const [uaAtualIndex, setUaAtualIndex] = useState(0);

  // Mapeamento de UAs bipadas por Item ID
  const [uasPorItem, setUasPorItem] = useState<Record<number, UA[]>>({});

  // Estado da Bipagem Atual
  const [codigoUA, setCodigoUA] = useState('');
  const [validandoUA, setValidandoUA] = useState(false);

  // Cache de unidades por produto_id
  const [unidadesCache, setUnidadesCache] = useState<Record<number, any[]>>({});

  // Controle de tentativas por item
  const [tentativasPorItem, setTentativasPorItem] = useState<Record<number, number>>({});
  const [finalizando, setFinalizando] = useState(false);

  // Estados de Qualidade (Seção de Qualidade)
  const [intEmbalagem, setIntEmbalagem] = useState('Sim');
  const [intMaterial, setIntMaterial] = useState('Sim');
  const [identificacaoCorreta, setIdentificacaoCorreta] = useState('Sim');
  const [certQualidade, setCertQualidade] = useState('Sim');

  useEffect(() => {
    async function carregarDados() {
      if (!id) return;
      try {
        const dados = await recebimentoService.listarAtividades();
        const atual = dados.find(r => r.id === Number(id));
        if (atual) {
          setRecebimento(atual);
          // Inicializa tentativas para itens que ainda não foram conferidos
          const tents: Record<number, number> = {};
          const uasMap: Record<number, any[]> = {};

          atual.itens.forEach(it => {
            tents[it.id] = it.tentativas || 3;
            
            // Retoma UAs bipadas anteriormente
            if (it.leituras && it.leituras.length > 0) {
              const estornos = it.leituras.filter(l => l.qtd < 0).map(l => l.ua);
              const efetivas = it.leituras.filter(l => l.qtd > 0 && !estornos.includes(l.ua));
              
              uasMap[it.id] = efetivas.map(l => ({
                ua: l.ua,
                quantidade: l.qtd,
                und: l.und,
                ean: l.ean,
                lote: l.lote,
                data_validade: l.data_validade ? new Date(l.data_validade).toLocaleDateString('pt-BR') : '',
                fator_conversao: l.fator_conversao,
                unidade_produto_id: l.unidade_produto_id,
                descricao_visual: l.descricao_visual,
                sku: it.sku,
                produto_id: it.produto_id
              }));
            }
          });
          setTentativasPorItem(tents);
          setUasPorItem(uasMap);
        } else {
          toast.error("Recebimento não encontrado.");
          navigate('/atividades');
        }
      } catch (error) {
        console.error("Erro ao carregar conferência:", error);
        toast.error("Falha ao carregar dados do recebimento.");
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, [id, navigate]);

  // Foco automático no input ao entrar no step de bipagem
  useEffect(() => {
    if (step === 'BIPAR_UA' && inputUARef.current) {
      inputUARef.current.focus();
    }
  }, [step]);

  // Carregamento de unidades em cache (Lazy Loading)
  useEffect(() => {
    const item = recebimento?.itens[itemAtualIndex];
    if (!item || !item.produto_id) return;

    if (!unidadesCache[item.produto_id]) {
      const carregarUnidades = async () => {
        try {
          const unidades = await produtoService.listarUnidades(item.produto_id!);
          setUnidadesCache(prev => ({ ...prev, [item.produto_id!]: unidades }));
        } catch (error) {
          console.error("Erro ao buscar unidades:", error);
        }
      };
      carregarUnidades();
    }
  }, [itemAtualIndex, recebimento]);

  const handleBiparUA = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codigoUA.trim() || validandoUA) return;

    setValidandoUA(true);
    try {
      const uaValida = await uaService.buscarPorCodigo(codigoUA.trim().toUpperCase());

      const itemAtual = recebimento?.itens[itemAtualIndex];
      if (!itemAtual) return;

      // Pega a unidade padrão (primeira da lista)
      const unidades = unidadesCache[itemAtual.produto_id!] || [];
      const unidadePadrao = unidades[0];

      // Adiciona a UA ao item atual
      const novaUa = {
        ...uaValida,
        sku: itemAtual.sku,
        produto_id: itemAtual.produto_id,
        fator_conversao: unidadePadrao?.fator_conversao || 1,
        unidade_medida_id: unidadePadrao?.unidade_medida_id,
        unidade_produto_id: unidadePadrao?.id
      };

      const novasUasDoItem = [...(uasPorItem[itemAtual.id] || []), novaUa];
      setUasPorItem(prev => ({
        ...prev,
        [itemAtual.id]: novasUasDoItem
      }));

      // Muda para a tela de conferência focada nesta UA
      setUaAtualIndex(novasUasDoItem.length - 1);
      setStep('CONFERENCIA');
      setCodigoUA('');
      toast.success("UA Bipada!");
    } catch (error: any) {
      console.error("Erro ao validar UA:", error);
      toast.error(error.response?.status === 404 ? "UA não encontrada!" : "Erro ao validar UA.");
      setCodigoUA('');
    } finally {
      setValidandoUA(false);
    }
  };

  // Navegação de Itens
  const proximoItem = () => {
    if (!recebimento) return;
    if (itemAtualIndex < recebimento.itens.length - 1) {
      setItemAtualIndex(prev => prev + 1);
      setUaAtualIndex(0);
      setStep('BIPAR_UA'); // Volta para o bipe ao trocar de item
    }
  };

  const anteriorItem = () => {
    if (itemAtualIndex > 0) {
      setItemAtualIndex(prev => prev - 1);
      setUaAtualIndex(0);
      setStep('BIPAR_UA');
    }
  };

  // Navegação de UAs
  const proximaUA = () => {
    const itemAtual = recebimento?.itens[itemAtualIndex];
    if (!itemAtual) return;
    const uas = uasPorItem[itemAtual.id] || [];
    if (uaAtualIndex < uas.length - 1) {
      setUaAtualIndex(prev => prev + 1);
    }
  };

  const anteriorUA = () => {
    if (uaAtualIndex > 0) {
      setUaAtualIndex(prev => prev - 1);
    }
  };

  const salvarLeituraIncremental = async (ua: any) => {
    if (!id || !itemAtual) return;
    try {
      const payload = {
        ua: ua.ua,
        quantidade: ua.quantidade || 0,
        unidade_produto_id: ua.unidade_produto_id,
        fator_conversao: ua.fator_conversao || 1,
        lote: ua.lote || null,
        data_validade: ua.data_validade || null,
        und: (unidadesCache[itemAtual.produto_id!] || []).find(und => und.unidade_medida_id === ua.unidade_medida_id)?.unidade_medida_relacao?.sigla || itemAtual.und,
        ean: ua.ean || null,
        descricao_visual: ua.descricao_visual || null,
      };
      await recebimentoService.registrarLeitura(Number(id), itemAtual.id, payload);
    } catch (error: any) {
      console.error("Erro ao salvar leitura incremental:", error);
      throw error;
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-500 font-bold animate-pulse">CARREGANDO CONFERÊNCIA...</span>
        </div>
      </div>
    );
  }

  const itemAtual = recebimento?.itens[itemAtualIndex];
  const uasDoItem = itemAtual ? (uasPorItem[itemAtual.id] || []) : [];
  const uaAtual = uasDoItem[uaAtualIndex];

  const totalBase = uasDoItem.reduce((acc, curr: any) => acc + (Number(curr.quantidade) || 0) * (curr.fator_conversao || 1), 0);
  const unidadesProd = itemAtual ? (unidadesCache[itemAtual.produto_id!] || []) : [];
  const unidadeAtiva = unidadesProd.find(u => u.unidade_medida_id === uaAtual?.unidade_medida_id);
  const fatorAtivo = unidadeAtiva?.fator_conversao || 1;
  const siglaAtiva = unidadeAtiva?.unidade_medida_relacao?.sigla || itemAtual?.und || '';
  const totalExibicao = totalBase / (fatorAtivo || 1);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans p-4">
      <main className="flex-1 max-w-lg mx-auto w-full flex flex-col justify-start">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200 flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">

          {/* CABEÇALHO INTERNO DO DISPOSITIVO */}
          <div className="bg-[#1e3a8a] text-white p-6 pb-4 shadow-lg z-10">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigate('/atividades', { replace: true })}
                className="text-white/70 hover:text-white transition-all transform hover:scale-110"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 8.959 8.959 0 11-18 0z" />
                </svg>
              </button>
              <div className="text-center">
                <h1 className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase italic">Conferência</h1>
                <p className="text-lg font-black tracking-tight">ROMANEIO #{id}</p>
              </div>
              <div className="w-10"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Navegação de Item */}
              <div className="bg-blue-900/40 rounded-2xl p-3 flex items-center justify-between border border-blue-400/20">
                <button
                  onClick={anteriorItem}
                  disabled={itemAtualIndex === 0}
                  className="p-1 hover:bg-white/10 rounded-full disabled:opacity-10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-blue-200 font-black uppercase tracking-widest leading-none mb-1">SKU</span>
                  <span className="text-xl font-black text-white font-mono">
                    {itemAtualIndex + 1}<span className="text-blue-400 mx-1 text-sm font-normal">/</span>{recebimento?.itens.length || 0}
                  </span>
                </div>
                <button
                  onClick={proximoItem}
                  disabled={!recebimento || itemAtualIndex === recebimento.itens.length - 1}
                  className="p-1 hover:bg-white/10 rounded-full disabled:opacity-10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
                </button>
              </div>

              {/* Navegação de UA */}
              <div className="bg-blue-900/40 rounded-2xl p-3 flex items-center justify-between border border-blue-400/20">
                <button
                  onClick={anteriorUA}
                  disabled={uaAtualIndex === 0}
                  className="p-1 hover:bg-white/10 rounded-full disabled:opacity-10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-blue-200 font-black uppercase tracking-widest leading-none mb-1">UA</span>
                  <span className="text-xl font-black text-white font-mono">
                    {uasDoItem.length > 0 ? uaAtualIndex + 1 : 0}<span className="text-blue-400 mx-1 text-sm font-normal">/</span>{uasDoItem.length}
                  </span>
                </div>
                <button
                  onClick={proximaUA}
                  disabled={uaAtualIndex === uasDoItem.length - 1 || uasDoItem.length === 0}
                  className="p-1 hover:bg-white/10 rounded-full disabled:opacity-10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {step === 'BIPAR_UA' ? (
              <div className="flex-1 flex flex-col items-center space-y-10 pt-12 p-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center w-full">
                  <div className="relative inline-block mb-6">
                    <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-25 animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-white border-4 border-blue-600 text-blue-600 rounded-full flex items-center justify-center shadow-xl">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-2">Insira a UA</h2>
                  <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl inline-block max-w-full">
                    <p className="text-sm font-bold text-blue-900">{itemAtual?.sku} | {itemAtual?.descricao}</p>
                  </div>
                </div>

                <form onSubmit={handleBiparUA} className="w-full">
                  <div className="relative">
                    <input
                      ref={inputUARef}
                      type="text"
                      value={codigoUA}
                      onChange={(e) => setCodigoUA(e.target.value)}
                      placeholder="DIGITE OU BIPE"
                      className="w-full bg-gray-50 border-4 border-gray-100 rounded-3xl p-8 text-5xl font-black text-center tracking-[0.1em] focus:border-[#1e3a8a] focus:bg-white focus:outline-none transition-all shadow-inner placeholder:text-gray-200"
                      disabled={validandoUA}
                      autoComplete="off"
                    />
                    {validandoUA && (
                      <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600"></div>
                          <span className="font-black text-blue-600 uppercase tracking-widest">Validando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </form>

                <div className="flex-1"></div>

                <div className="w-full h-1 bg-gray-100 rounded-full opacity-50"></div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
                {/* SUB-HEADER DA UA ATUAL */}
                <div className="bg-blue-50 px-6 py-4 flex justify-between items-center border-b border-blue-100">
                  <div className="text-2xl font-black text-[#1e3a8a] tracking-widest">{uaAtual?.ua}</div>
                  <button
                    onClick={async () => {
                      if (!uaAtual) return;
                      setFinalizando(true);
                      try {
                        await salvarLeituraIncremental(uaAtual);
                        setStep('BIPAR_UA');
                      } catch (e: any) {
                        toast.error(e.response?.data?.detail || "Erro ao salvar UA.");
                      } finally {
                        setFinalizando(false);
                      }
                    }}
                    disabled={finalizando}
                    className="bg-[#1e3a8a] text-white text-[10px] px-3 py-1.5 font-black uppercase rounded-lg hover:bg-blue-900 transition-colors shadow-md disabled:opacity-50"
                  >
                    Nova UA
                  </button>
                </div>

                {/* CONTEÚDO DO FORMULÁRIO */}
                <div className="p-8 flex-1 space-y-8 overflow-y-auto">
                  <div className="bg-gray-50 p-5 rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-lg font-black text-gray-800 leading-tight mb-2">{itemAtual?.descricao}</p>
                    <p className="text-sm font-bold text-blue-600 italic">SKU: {itemAtual?.sku}</p>
                  </div>

                  {/* SEÇÃO DE IDENTIFICAÇÃO DO PRODUTO */}
                  <div className="bg-white border-2 border-blue-50 rounded-[2rem] p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Identificação</label>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight group-hover:text-blue-800 transition-colors">Sem GTIN?</span>
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={!!uaAtual?.sem_gtin}
                          onChange={(e) => {
                            const val = e.target.checked;
                            const novasUas = [...uasDoItem];
                            novasUas[uaAtualIndex] = {
                              ...uaAtual,
                              sem_gtin: val,
                              ean: val ? '' : (uaAtual.ean || ''),
                              descricao_visual: val ? (uaAtual.descricao_visual || '') : ''
                            };
                            setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        {!uaAtual?.sem_gtin ? (
                          <input
                            type="text"
                            placeholder="BIPE OU DIGITE O GTIN"
                            className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 font-black text-xl text-blue-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-all placeholder:text-blue-200"
                            value={uaAtual?.ean || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const novasUas = [...uasDoItem];
                              novasUas[uaAtualIndex] = { ...uaAtual, ean: val };
                              setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="DESCRIÇÃO VISUAL"
                            className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 font-black text-xl text-blue-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-all placeholder:text-blue-200 animate-in fade-in zoom-in-95 duration-300"
                            value={uaAtual?.descricao_visual || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const novasUas = [...uasDoItem];
                              novasUas[uaAtualIndex] = { ...uaAtual, descricao_visual: val };
                              setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-emerald-600 text-white p-5 rounded-[2rem] shadow-lg shadow-emerald-200">
                      <label className="text-[9px] font-black uppercase tracking-widest block opacity-70 mb-1">Total Bipado</label>
                      <div className="text-3xl font-black">
                        {totalExibicao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                        <span className="text-xs ml-1 opacity-50 uppercase">{siglaAtiva}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="relative">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] block mb-2 pl-2">Quantidade</label>
                      <input
                        type="number"
                        className="w-full bg-white border-4 border-blue-50 rounded-[1.5rem] p-5 text-4xl font-black text-blue-700 shadow-inner focus:border-blue-500 focus:outline-none transition-all"
                        value={uaAtual?.quantidade || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const novasUas = [...uasDoItem];
                          novasUas[uaAtualIndex] = { ...uaAtual, quantidade: val };
                          setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-2">Lote</label>
                        <input
                          type="text"
                          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 font-black text-lg text-gray-800 focus:border-blue-500 focus:outline-none transition-all uppercase"
                          value={uaAtual?.lote || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const novasUas = [...uasDoItem];
                            novasUas[uaAtualIndex] = { ...uaAtual, lote: val };
                            setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                          }}
                        />
                      </div>
                      <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-2">Unidade</label>
                        <select
                          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 font-black text-lg text-gray-800 focus:border-blue-500 focus:outline-none transition-all appearance-none"
                          value={uaAtual?.unidade_medida_id || ''}
                          onChange={(e) => {
                            const undId = Number(e.target.value);
                            const undObj = (unidadesCache[itemAtual!.produto_id!] || []).find(u => u.unidade_medida_id === undId);
                            if (undObj) {
                              const novasUas = [...uasDoItem];
                              novasUas[uaAtualIndex] = {
                                ...uaAtual,
                                unidade_medida_id: undId,
                                fator_conversao: undObj.fator_conversao,
                                unidade_produto_id: undObj.id
                              };
                              setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                            }
                          }}
                        >
                          {(unidadesCache[itemAtual?.produto_id!] || []).map(und => (
                            <option key={und.id} value={und.unidade_medida_id}>
                              {und.unidade_medida_relacao?.sigla}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 pl-2">Validade</label>
                        <input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 font-black text-lg text-gray-800 focus:border-blue-500 focus:outline-none transition-all"
                          value={uaAtual?.data_validade || ''}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
                            if (val.length > 8) val = val.slice(0, 8); // Limita a 8 dígitos
                            
                            // Aplica a máscara DD/MM/AAAA
                            let formatado = val;
                            if (val.length > 2) {
                              formatado = val.slice(0, 2) + '/' + val.slice(2);
                            }
                            if (val.length > 4) {
                              formatado = formatado.slice(0, 5) + '/' + formatado.slice(5);
                            }

                            const novasUas = [...uasDoItem];
                            novasUas[uaAtualIndex] = { ...uaAtual, data_validade: formatado };
                            setUasPorItem(prev => ({ ...prev, [itemAtual!.id]: novasUas }));
                          }}
                        />
                      </div>
                    </div>


                    {/* SEÇÃO DE QUALIDADE */}
                    <div className="bg-white border-2 border-amber-50 rounded-[2rem] p-6 space-y-4 shadow-sm">
                      <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest pl-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Inspeção de Qualidade
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { label: 'Embalagem Íntegra?', state: intEmbalagem, setState: setIntEmbalagem },
                          { label: 'Material Íntegro?', state: intMaterial, setState: setIntMaterial },
                          { label: 'Identificação Correta?', state: identificacaoCorreta, setState: setIdentificacaoCorreta },
                          { label: 'Certificado Qualidade?', state: certQualidade, setState: setCertQualidade }
                        ].map((q, i) => (
                          <div key={i} className="flex items-center justify-between bg-amber-50/30 p-3 rounded-2xl border border-amber-100">
                            <span className="text-xs font-bold text-gray-700">{q.label}</span>
                            <select
                              value={q.state}
                              onChange={(e) => q.setState(e.target.value)}
                              className={`text-sm font-black rounded-lg px-3 py-1 border-2 focus:outline-none transition-colors ${q.state === 'Sim' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                }`}
                            >
                              <option value="Sim">Sim</option>
                              <option value="Não">Não</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AÇÃO FINAL DA TELA */}
                <div className="p-8 bg-gray-50 border-t border-gray-100">
                  <Button
                    variant="primary"
                    className="w-full py-6 text-2xl font-black uppercase tracking-widest rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                    loading={finalizando}
                    onClick={async () => {
                      if (!itemAtual) return;

                      // VALIDAÇÃO DE IDENTIFICAÇÃO
                      const identificacaoIncompleta = uasDoItem.some(u => !u.ean && !u.descricao_visual);
                      if (identificacaoIncompleta) {
                        toast.error("Código de barras inválido!", {
                          style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                        });
                        return;
                      }

                      // VALIDAÇÃO DE LOTE E VALIDADE OBRIGATÓRIOS
                      const loteObrigatorio = itemAtual.lote_obrigatorio || itemAtual.bloquear_sem_lote;
                      const validadeObrigatoria = itemAtual.bloquear_sem_validade;

                      for (const ua of uasDoItem) {
                        if (loteObrigatorio && (!ua.lote || !ua.lote.trim())) {
                          toast.error("Lote obrigatório para este produto!", {
                            style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                          });
                          return;
                        }
                        if (validadeObrigatoria && (!ua.data_validade || !ua.data_validade.trim())) {
                          toast.error("Validade obrigatória para este produto!", {
                            style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                          });
                          return;
                        }
                      }

                      let statusFinal = 'CONFERIDO';

                      // VALIDAÇÃO DE VENCIMENTO MÍNIMO
                      if (itemAtual.vencimento_minimo) {
                        let temVencimentoCurto = false;
                        for (const ua of uasDoItem) {
                          if (ua.data_validade) {
                            try {
                              const parts = ua.data_validade.split('/');
                              if (parts.length === 3) {
                                const dataVal = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                const diffTime = dataVal.getTime() - hoje.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays < itemAtual.vencimento_minimo) {
                                  temVencimentoCurto = true;
                                  break;
                                }
                              }
                            } catch (e) {
                              console.error("Erro ao validar data:", e);
                            }
                          }
                        }

                        if (temVencimentoCurto) {
                          const prosseguir = window.confirm(`Atenção: há volumes com vencimento abaixo do mínimo permitido (${itemAtual.vencimento_minimo} dias). Deseja finalizar e enviar para análise?`);
                          if (!prosseguir) return;
                          statusFinal = 'DIVERGENTE';
                        }
                      }

                      const totalBipado = uasDoItem.reduce((acc, curr: any) => acc + (Number(curr.quantidade) || 0) * (curr.fator_conversao || 1), 0);

                      // Busca o fator da unidade da NA nota para comparar na base comum
                      const unidadesProdComp = unidadesCache[itemAtual.produto_id!] || [];
                      const undNota = unidadesProdComp.find(u => u.unidade_medida_relacao?.sigla === itemAtual.und);
                      const fatorNota = undNota?.fator_conversao || 1;
                      const qtdEsperadaBase = itemAtual.qtd_nota * fatorNota;

                      if (Math.abs(totalBipado - qtdEsperadaBase) > 0.01) {
                        const tentsRestantes = (tentativasPorItem[itemAtual.id] || 3) - 1;
                        if (tentsRestantes > 0) {
                          setTentativasPorItem(prev => ({ ...prev, [itemAtual.id]: tentsRestantes }));
                          toast.error(`Quantidade divergente! Você tem mais ${tentsRestantes} tentativas.`, {
                            duration: 5000,
                            position: 'top-center',
                            style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                          });
                          return;
                        } else {
                          statusFinal = 'DIVERGENTE';
                        }
                      }

                      // Enviar para o backend
                      setFinalizando(true);
                      try {
                        // 1. Salva a UA atual antes de finalizar
                        await salvarLeituraIncremental(uaAtual);

                        // 2. Finaliza o item
                        const payload = {
                          tentativas: 3 - (tentativasPorItem[itemAtual.id] || 3) + 1,
                          status_final: statusFinal,
                          int_embalagem: intEmbalagem,
                          int_material: intMaterial,
                          identificacao: identificacaoCorreta,
                          cert_qual: certQualidade,
                          leituras: [] // Backend já tem as leituras salvas incrementalmente
                        };

                        const itemAtualizado = await recebimentoService.registrarConferenciaItem(Number(id), itemAtual.id, payload);

                        toast.success(statusFinal === 'CONFERIDO' ? "Item Conferido com Sucesso!" : "Item Finalizado com Divergência");

                        // Atualiza o estado local para que o findIndex veja o novo status
                        let proximosItens = recebimento?.itens || [];
                        if (recebimento) {
                          const novosItens = [...recebimento.itens];
                          const idx = novosItens.findIndex(i => i.id === itemAtual.id);
                          if (idx !== -1) {
                            novosItens[idx] = itemAtualizado;
                            setRecebimento({ ...recebimento, itens: novosItens });
                            proximosItens = novosItens;
                          }
                        }

                        // Busca o próximo item pendente usando a lista atualizada
                        const indexProximo = proximosItens.findIndex((it, idx) =>
                          idx > itemAtualIndex && (it.status === 'AGUARDANDO_CONFERENCIA' || it.status === 'EM_CONFERENCIA')
                        );

                        if (indexProximo !== -1) {
                          setItemAtualIndex(indexProximo);
                          setStep('BIPAR_UA');
                          setUaAtualIndex(0);
                          setUasPorItem(prev => ({ ...prev, [itemAtual.id]: [] })); // Limpa localmente as leituras do item finalizado
                        } else {
                          // Se não achou depois do atual, tenta do começo
                          const indexVolta = proximosItens.findIndex((it) =>
                            (it.status === 'AGUARDANDO_CONFERENCIA' || it.status === 'EM_CONFERENCIA') && it.id !== itemAtual.id
                          );
                          if (indexVolta !== -1) {
                            setItemAtualIndex(indexVolta);
                            setStep('BIPAR_UA');
                            setUaAtualIndex(0);
                            setUasPorItem(prev => ({ ...prev, [itemAtual.id]: [] }));
                          } else {
                            toast("Todas as tarefas concluídas!", { icon: '🎉' });
                            navigate('/atividades');
                          }
                        }
                      } catch (error: any) {
                        console.error(error);
                        toast.error(error.message || "Erro ao salvar conferência.");
                      } finally {
                        setFinalizando(false);
                      }
                    }}
                  >
                    Finalizar
                  </Button>
                  <button
                    disabled={finalizando || !uaAtual}
                    onClick={async () => {
                      if (!itemAtual || !uaAtual) return;
                      if (!confirm("Tem certeza que deseja excluir este volume? Será gerado um estorno no sistema.")) return;
                      
                      setFinalizando(true);
                      try {
                        await recebimentoService.estornarLeitura(Number(id), itemAtual.id, uaAtual.ua);
                        
                        const novasUas = uasDoItem.filter((_, i) => i !== uaAtualIndex);
                        setUasPorItem(prev => ({ ...prev, [itemAtual.id]: novasUas }));
                        setUaAtualIndex(0);
                        setStep('BIPAR_UA');
                        toast.success("Volume Excluído (Estornado)");
                      } catch (e: any) {
                        toast.error(e.response?.data?.detail || "Erro ao estornar volume.");
                      } finally {
                        setFinalizando(false);
                      }
                    }}
                    className="w-full mt-4 text-xs font-black text-red-400 uppercase tracking-widest hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    Excluir este Volume
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
