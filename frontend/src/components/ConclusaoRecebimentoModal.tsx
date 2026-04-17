import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Tooltip } from './Tooltip';
import type { Recebimento } from '../types/recebimento';

interface ConclusaoRecebimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rejeitados: { uas: string[], itens: number[] }, resolucoes_sobra: Record<number, string>, isParcial: boolean) => void;
  recebimento: Recebimento | null;
  loading: boolean;
}


interface AnomaliaUA {
  ua: string;
  problemas: string[];
  quantidade: number;
}

interface ItemComExcecao {
  item_id: number;
  sku: string;
  descricao: string;
  qtd_nota: number;
  qtd_rec: number;
  und: string;
  unidades_com_problema: AnomaliaUA[];
  unidades_ok: AnomaliaUA[];
  fracionavel_recebimento: boolean;
}

export function ConclusaoRecebimentoModal({
  isOpen,
  onClose,
  onConfirm,
  recebimento,
  loading
}: ConclusaoRecebimentoModalProps) {
  const [qualidadeAprovados, setQualidadeAprovados] = useState<Record<string, boolean>>({});
  const [itensComExcecao, setItensComExcecao] = useState<ItemComExcecao[]>([]);
  const [resolucoesSobra, setResolucoesSobra] = useState<Record<number, string>>({});
  const [isParcial, setIsParcial] = useState(false);


  useEffect(() => {
    if (isOpen && recebimento) {
      const listaExcecoes: ItemComExcecao[] = [];

      recebimento.itens.forEach(item => {
        const diff = (item.qtd_recebida || 0) - item.qtd_nota;
        const uasRuins: AnomaliaUA[] = [];
        const uasBoas: AnomaliaUA[] = [];

        // Coleta problemas de qualidade nas leituras
        item.leituras?.forEach(l => {
          const checkProblem = (val: string | null | undefined) => {
            if (!val) return false;
            const normalized = val.toLowerCase().trim();
            return normalized === 'não' || normalized === 'nao' || normalized === 'n';
          };

          const probList: string[] = [];
          if (checkProblem(l.int_material)) probList.push("Material danificado");
          if (checkProblem(l.int_embalagem)) probList.push("Embalagem não íntegra");
          if (checkProblem(l.identificacao)) probList.push("Identificação incorreta");
          if (checkProblem(l.cert_qual)) probList.push("Sem certificado de qualidade");

          if (l.data_validade) {
            const dataVal = new Date(l.data_validade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
              probList.push("Produto Vencido");
            } else if (item.vencimento_minimo && diffDays < item.vencimento_minimo) {
              probList.push(`Shelf-life baixo (${diffDays} dias)`);
            }
          }

          if (probList.length > 0) {
            uasRuins.push({
              ua: l.ua,
              problemas: probList,
              quantidade: l.qtd
            });
          } else {
            uasBoas.push({
              ua: l.ua,
              problemas: [],
              quantidade: l.qtd
            });
          }
        });

        // Se tem qualquer anomalia (quantidade ou qualidade), adiciona na lista
        if (Math.abs(diff) > 0.0001 || uasRuins.length > 0) {
          listaExcecoes.push({
            item_id: item.id,
            sku: item.sku || item.codigo_fornecedor || 'N/A',
            descricao: item.descricao,
            qtd_nota: item.qtd_nota,
            qtd_rec: item.qtd_recebida || 0,
            und: item.und,
            unidades_com_problema: uasRuins,
            unidades_ok: uasBoas,
            fracionavel_recebimento: item.fracionavel_recebimento ?? true
          });
        }
      });

      setItensComExcecao(listaExcecoes);

      // Inicia resoluções padrão para sobras
      const rSobra: Record<number, string> = {};
      listaExcecoes.forEach(item => {
        if (item.qtd_rec > item.qtd_nota) {
          rSobra[item.item_id] = 'ACEITAR_EXCESSO'; // Padrão
        }
      });
      setResolucoesSobra(rSobra);

      // Inicia todas as UAs (ruins e boas) como aprovadas (checked)
      const qCheck: Record<string, boolean> = {};
      listaExcecoes.forEach(item => {
        item.unidades_com_problema.forEach(ua => {
          qCheck[ua.ua] = true;
        });
        item.unidades_ok.forEach(ua => {
          qCheck[ua.ua] = true;
        });
      });
      setQualidadeAprovados(qCheck);
    }
  }, [isOpen, recebimento]);


  if (!recebimento) return null;

  const handleFinalizar = () => {
    // Verifica se todos os itens com sobra têm uma resolução
    const pendente = itensComExcecao.some(it => {
      const qtdEfetiva = calcularQtdEfetiva(it);
      return qtdEfetiva > it.qtd_nota && !resolucoesSobra[it.item_id];
    });

    if (pendente) {
      alert("Por favor, selecione uma resolução para todos os itens com sobra.");
      return;
    }

    const uasRejeitadas = Object.keys(qualidadeAprovados).filter(ua => !qualidadeAprovados[ua]);
    onConfirm({ uas: uasRejeitadas, itens: [] }, resolucoesSobra, isParcial);
  };


  const calcularQtdEfetiva = (item: ItemComExcecao) => {
    const subtrairProblema = item.unidades_com_problema
      .filter(ua => !qualidadeAprovados[ua.ua])
      .reduce((acc, curr) => acc + curr.quantidade, 0);

    const subtrairBoas = item.unidades_ok
      .filter(ua => !qualidadeAprovados[ua.ua])
      .reduce((acc, curr) => acc + curr.quantidade, 0);

    return Math.max(0, item.qtd_rec - subtrairProblema - subtrairBoas);
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="bg-wms-fundo rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">


        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="text-sm text-gray-400 italic">
            Divergências detectadas. Revise antes de concluir.
          </div>

          <div className="space-y-4">
            {itensComExcecao.map(item => {
              const qtdEfetiva = calcularQtdEfetiva(item);

              return (
                <div key={item.item_id} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  {/* Item Body */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-[#1a63b6]">{item.sku}</span>
                        <span className="text-gray-300">|</span>
                        <h4 className="text-sm font-bold text-gray-800 truncate">{item.descricao}</h4>
                      </div>
                    </div>

                    <div className="flex items-end justify-start space-x-12">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase">Qtd. a Receber</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-2xl font-black text-gray-900">{Math.round(qtdEfetiva)}</span>
                          <span className="text-xs text-gray-400 font-medium tracking-tight">/ {Math.round(item.qtd_nota)}</span>
                        </div>
                      </div>

                      {/* Resoluções de Sobra */}
                      {qtdEfetiva > item.qtd_nota && (
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Gestão de Sobras</span>
                            {!item.fracionavel_recebimento && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase flex items-center">
                                <svg className="w-2.5 h-2.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Indivisível
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            {[
                              { id: 'ACEITAR_EXCESSO', label: 'Aceitar', desc: 'Valida os volumes excedidos e os libera para uso.' },
                              ...(item.fracionavel_recebimento ? [{ id: 'ESTORNAR_EXCESSO', label: 'Recusar', desc: 'Estorna os volumes excedidos.' }] : [])
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setResolucoesSobra(prev => ({ ...prev, [item.item_id]: opt.id }))}
                                className={`px-3 py-1.5 text-[8.5px] font-bold uppercase rounded-md transition-all whitespace-nowrap flex items-center space-x-1.5 group/btn ${resolucoesSobra[item.item_id] === opt.id
                                  ? 'bg-[#1a63b6] text-white shadow-sm'
                                  : 'text-gray-500 hover:bg-white hover:text-gray-700'
                                  }`}
                              >
                                <span>{opt.label}</span>
                                <Tooltip text={opt.desc} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bad UAs List */}
                  {item.unidades_com_problema.length > 0 && (
                    <div className="px-4 pb-4 pt-1 bg-amber-50/50 space-y-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Unidades com Problemas</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {item.unidades_com_problema.map(ua => (
                          <label
                            key={ua.ua}
                            className={`flex items-center px-3 py-2 rounded-lg border transition-all cursor-pointer ${qualidadeAprovados[ua.ua]
                              ? 'border-gray-100 bg-white hover:bg-gray-50'
                              : 'border-amber-200 bg-amber-50 shadow-sm'
                              }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-[#1a63b6] focus:ring-[#1a63b6] mr-3 border-gray-300 transition-all cursor-pointer"
                              checked={qualidadeAprovados[ua.ua]}
                              onChange={() => setQualidadeAprovados(prev => ({ ...prev, [ua.ua]: !prev[ua.ua] }))}
                            />
                            <div className="flex-1 flex items-center">
                              <span className="text-sm font-bold text-gray-700 min-w-[80px]">{ua.ua}</span>
                              <div className="w-px h-6 bg-gray-200 mx-4 shrink-0" />
                              <div className="flex flex-wrap gap-1.5 py-1">
                                {ua.problemas.map((p, idx) => (
                                  <span key={idx} className="text-[9px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded uppercase">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Good UAs List (Collapsible, for manual excess estorno) */}
                  {item.unidades_ok.length > 0 && item.qtd_rec > item.qtd_nota && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50/50 border-t border-gray-100">
                      <details className="group">
                        <summary className="text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer flex items-center hover:text-[#1a63b6] transition-colors select-none">
                          <svg className="w-3 h-3 mr-1.5 text-gray-400 transform group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Exibir {item.unidades_ok.length} UAs Íntegras
                        </summary>
                        <div className="grid grid-cols-1 gap-1.5 mt-3 pl-4">
                          {item.unidades_ok.map(ua => (
                            <label
                              key={ua.ua}
                              className={`flex items-center px-3 py-2 rounded-lg border transition-all cursor-pointer ${qualidadeAprovados[ua.ua]
                                ? 'border-gray-200 bg-white hover:bg-gray-50'
                                : 'border-red-200 bg-red-50 shadow-sm'
                                }`}
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-[#1a63b6] focus:ring-[#1a63b6] mr-3 border-gray-300 transition-all cursor-pointer"
                                checked={qualidadeAprovados[ua.ua]}
                                onChange={() => setQualidadeAprovados(prev => ({ ...prev, [ua.ua]: !prev[ua.ua] }))}
                              />
                              <div className="flex-1 flex items-center">
                                <span className="text-sm font-bold text-gray-700 min-w-[80px]">{ua.ua}</span>
                                <div className="w-px h-6 bg-gray-200 mx-4 shrink-0" />
                                <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded uppercase">
                                  Ok
                                </span>
                                <span className="text-xs font-bold text-gray-400 ml-auto">
                                  {ua.quantidade} {item.und}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {itensComExcecao.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold">Tudo certo com o recebimento!</p>
              <p className="text-sm text-gray-500">Nenhuma divergência de qualidade ou quantidade encontrada.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          {itensComExcecao.some(it => calcularQtdEfetiva(it) < it.qtd_nota) && (
            <div className="flex-1 flex items-center px-4">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-[#1a63b6] rounded border-gray-300 focus:ring-[#1a63b6]"
                  checked={isParcial}
                  onChange={(e) => setIsParcial(e.target.checked)}
                />
                <span className="text-sm font-bold text-gray-700 group-hover:text-[#1a63b6] transition-colors">Recebimento parcial</span>
              </label>
            </div>
          )}
          <button
            onClick={handleFinalizar}
            disabled={loading}
            className="px-8 py-2 rounded-lg bg-[#1a63b6] text-white font-bold text-sm hover:opacity-90 shadow-md transition-all flex items-center disabled:opacity-50"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Concluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
