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

interface AnomaliaQualidade {
  tipo: string;
  ua: string;
  descricao: string;
  sku: string;
}

interface AnomaliaQuantidade {
  item_id: number;
  sku: string;
  descricao: string;
  qtd_nota: number;
  qtd_rec: number;
  diff: number;
}

export function ConclusaoRecebimentoModal({
  isOpen,
  onClose,
  onConfirm,
  recebimento,
  loading
}: ConclusaoRecebimentoModalProps) {
  const [qualidadeAprovados, setQualidadeAprovados] = useState<Record<string, boolean>>({});
  const [quantidadeAprovados, setQuantidadeAprovados] = useState<Record<number, boolean>>({});
  const [excecoes, setExcecoes] = useState<{ qualidade: AnomaliaQualidade[], quantidade: AnomaliaQuantidade[] }>({ qualidade: [], quantidade: [] });

  useEffect(() => {
    if (isOpen && recebimento) {
      const q: AnomaliaQualidade[] = [];
      const n: AnomaliaQuantidade[] = [];

      recebimento.itens.forEach(item => {
        // Discrepância de Quantidade
        const diff = (item.qtd_recebida || 0) - item.qtd_nota;
        if (Math.abs(diff) > 0.0001) {
          n.push({
            item_id: item.id,
            sku: item.sku || item.codigo_fornecedor || 'N/A',
            descricao: item.descricao,
            qtd_nota: item.qtd_nota,
            qtd_rec: item.qtd_recebida || 0,
            diff: Number(diff.toFixed(4))
          });
        }

        // Problemas de Qualidade/Validade
        item.leituras?.forEach(l => {
          let prob = "";
          if (l.int_embalagem === 'Não') prob = "Embalagem não íntegra";
          else if (l.int_material === 'Não') prob = "Material danificado";
          else if (l.identificacao === 'Não') prob = "Identificação incorreta";
          else if (l.cert_qual === 'Não') prob = "Sem certificado de qualidade";
          
          if (!prob && item.vencimento_minimo && l.data_validade) {
            const dataVal = new Date(l.data_validade);
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const diffDays = Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < item.vencimento_minimo) {
              prob = `Shelf-life baixo (${diffDays} dias)`;
            } else if (diffDays <= 0) {
              prob = "Produto Vencido";
            }
          }

          if (prob) {
            q.push({
              tipo: prob,
              ua: l.ua,
              descricao: item.descricao,
              sku: item.sku || ""
            });
          }
        });
      });

      setExcecoes({ qualidade: q, quantidade: n });
      
      // Inicia todos como aprovados (checked)
      const qCheck: Record<string, boolean> = {};
      q.forEach(ex => qCheck[ex.ua] = true);
      const nCheck: Record<number, boolean> = {};
      n.forEach(ex => nCheck[ex.item_id] = true);
      
      setQualidadeAprovados(qCheck);
      setQuantidadeAprovados(nCheck);
    }
  }, [isOpen, recebimento]);

  if (!recebimento) return null;

  const handleFinalizar = () => {
    const uasRejeitadas = excecoes.qualidade
      .filter(q => !qualidadeAprovados[q.ua])
      .map(q => q.ua);
    
    const itensRejeitados = excecoes.quantidade
      .filter(n => !quantidadeAprovados[n.item_id])
      .map(n => n.item_id);

    onConfirm({ uas: uasRejeitadas, itens: itensRejeitados });
  };

  const temQualidade = excecoes.qualidade.length > 0;
  const temQuantidade = excecoes.quantidade.length > 0;

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
            Encontramos algumas divergências no recebimento da nota <b>{recebimento.nfe}</b>. 
            Revise-as abaixo e selecione o que deseja aceitar para o estoque.
          </div>

          {/* Seção QUANTIDADE */}
          {temQuantidade && (
            <div className="space-y-3">
              <h3 className="text-gray-900 font-bold flex items-center uppercase text-xs tracking-wider">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                Divergências de Quantidade
              </h3>
              <div className="space-y-2">
                {excecoes.quantidade.map(item => (
                  <label 
                    key={item.item_id}
                    className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${quantidadeAprovados[item.item_id] ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-3 border-gray-300"
                      checked={quantidadeAprovados[item.item_id]}
                      onChange={() => setQuantidadeAprovados(prev => ({ ...prev, [item.item_id]: !prev[item.item_id] }))}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800">{item.sku}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.diff > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {item.diff > 0 ? `Sobra (+${item.diff})` : `Falta (${item.diff})`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{item.descricao}</div>
                      <div className="mt-1 text-xs font-medium text-gray-700">
                        Receber <span className="text-blue-600 underline font-bold">{item.qtd_rec} unidades</span> (Nota: {item.qtd_nota})
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Seção QUALIDADE/VALIDADE */}
          {temQualidade && (
            <div className="space-y-3">
              <h3 className="text-gray-900 font-bold flex items-center uppercase text-xs tracking-wider">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                Problemas de Qualidade / Validade
              </h3>
              <div className="space-y-2">
                {excecoes.qualidade.map(ex => (
                  <label 
                    key={ex.ua}
                    className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${qualidadeAprovados[ex.ua] ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-3 border-gray-300"
                      checked={qualidadeAprovados[ex.ua]}
                      onChange={() => setQualidadeAprovados(prev => ({ ...prev, [ex.ua]: !prev[ex.ua] }))}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800">UA: {ex.ua}</span>
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">
                          {ex.tipo}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{ex.sku} - {ex.descricao}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {(!temQualidade && !temQuantidade) && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-gray-900 font-bold">Nenhuma exceção detectada!</p>
                <p className="text-sm text-gray-500">A conferência foi perfeita. Deseja finalizar agora?</p>
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
