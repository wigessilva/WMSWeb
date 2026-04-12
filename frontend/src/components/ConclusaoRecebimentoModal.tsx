import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { Recebimento } from '../types/recebimento';

interface ConclusaoRecebimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rejeitados: { uas: string[], itens: number[] }) => void;
  recebimento: Recebimento | null;
  loading: boolean;
}

interface AnomaliaUA {
  ua: string;
  tipo: string;
  quantidade: number;
}

interface ItemComExcecao {
  item_id: number;
  sku: string;
  descricao: string;
  qtd_nota: number;
  qtd_rec: number;
  unidades_com_problema: AnomaliaUA[];
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

  useEffect(() => {
    if (isOpen && recebimento) {
      const listaExcecoes: ItemComExcecao[] = [];

      recebimento.itens.forEach(item => {
        const diff = (item.qtd_recebida || 0) - item.qtd_nota;
        const uasRuins: AnomaliaUA[] = [];

        // Coleta problemas de qualidade nas leituras
        item.leituras?.forEach(l => {
          const checkProblem = (val: string | null | undefined) => {
            if (!val) return false;
            const normalized = val.toLowerCase().trim();
            return normalized === 'não' || normalized === 'nao' || normalized === 'n';
          };

          let prob = "";
          if (checkProblem(l.int_material)) prob = "Material danificado";
          else if (checkProblem(l.int_embalagem)) prob = "Embalagem não íntegra";
          else if (checkProblem(l.identificacao)) prob = "Identificação incorreta";
          else if (checkProblem(l.cert_qual)) prob = "Sem certificado de qualidade";

          if (!prob && l.data_validade) {
            const dataVal = new Date(l.data_validade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
              prob = "Produto Vencido";
            } else if (item.vencimento_minimo && diffDays < item.vencimento_minimo) {
              prob = `Shelf-life baixo (${diffDays} dias)`;
            }
          }

          if (prob) {
            uasRuins.push({
              ua: l.ua,
              tipo: prob,
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
            unidades_com_problema: uasRuins
          });
        }
      });

      setItensComExcecao(listaExcecoes);

      // Inicia todas as UAs ruins como aprovadas (checked)
      const qCheck: Record<string, boolean> = {};
      listaExcecoes.forEach(item => {
        item.unidades_com_problema.forEach(ua => {
          qCheck[ua.ua] = true;
        });
      });
      setQualidadeAprovados(qCheck);
    }
  }, [isOpen, recebimento]);

  if (!recebimento) return null;

  const handleFinalizar = () => {
    const uasRejeitadas = Object.keys(qualidadeAprovados).filter(ua => !qualidadeAprovados[ua]);
    onConfirm({ uas: uasRejeitadas, itens: [] });
  };

  const calcularQtdEfetiva = (item: ItemComExcecao) => {
    const subtrair = item.unidades_com_problema
      .filter(ua => !qualidadeAprovados[ua.ua])
      .reduce((acc, curr) => acc + curr.quantidade, 0);

    return Math.max(0, item.qtd_rec - subtrair);
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold flex items-center italic">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Gestão por Exceção
          </h2>
          <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
            Divergências detectadas na nota <b>{recebimento.nfe}</b>.
            Revise as quantidades e condições físicas abaixo para autorizar o recebimento.
          </div>

          <div className="space-y-4">
            {itensComExcecao.map(item => {
              const qtdEfetiva = calcularQtdEfetiva(item);
              const diffFinal = qtdEfetiva - item.qtd_nota;

              return (
                <div key={item.item_id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Item Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{item.sku}</span>
                        <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.descricao}</h4>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${diffFinal === 0 ? 'bg-green-100 text-green-700' : diffFinal > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {diffFinal === 0 ? 'Quantidade Ok' : diffFinal > 0 ? `Sobra (+${diffFinal.toFixed(2)})` : `Falta (${diffFinal.toFixed(2)})`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Quantidade a receber: </span>
                      <span className="text-blue-700 font-black text-lg">
                        {qtdEfetiva.toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs ml-2"> (Nota: {item.qtd_nota.toFixed(2)})</span>
                    </div>
                  </div>

                  {/* Bad UAs List */}
                  {item.unidades_com_problema.length > 0 && (
                    <div className="p-4 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Unidades com Problemas de Qualidade</p>
                      {item.unidades_com_problema.map(ua => (
                        <label
                          key={ua.ua}
                          className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${qualidadeAprovados[ua.ua] ? 'border-gray-100 bg-white hover:bg-gray-50' : 'border-red-200 bg-red-50'}`}
                        >
                          <div className="flex items-center w-full" onClick={(e) => {
                            e.preventDefault();
                            setQualidadeAprovados(prev => ({ ...prev, [ua.ua]: !prev[ua.ua] }));
                          }}>
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-3 border-gray-300"
                              checked={qualidadeAprovados[ua.ua]}
                              onChange={() => { }}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">UA: {ua.ua}</span>
                                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">
                                  {ua.tipo}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">Quantidade nesta unidade: {ua.quantidade}</div>
                            </div>
                          </div>
                        </label>
                      ))}
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
            className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizar}
            disabled={loading}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            Finalizar Recebimento
          </button>
        </div>
      </div>
    </Modal>
  );
}
