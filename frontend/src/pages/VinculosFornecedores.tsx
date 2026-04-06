import { useState, useMemo } from 'react';
import { ActionToolbar } from '../components/ActionToolbar';
import toast from 'react-hot-toast';

// Tipagem baseada nas instruções (o serviço será plugado futuramente)
type VinculoFornecedor = {
  id: number;
  sku: string;
  descricao: string;
  codigoFornecedor: string;
  cnpjFornecedor: string;
};

export default function VinculosFornecedores() {
  const [vinculos, setVinculos] = useState<VinculoFornecedor[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [vinculoSelecionado, setVinculoSelecionado] = useState<VinculoFornecedor | null>(null);

  const vinculosFiltrados = useMemo(() => {
    if (!termoBusca) return vinculos;
    const termo = termoBusca.toLowerCase();
    return vinculos.filter(v =>
      v.sku.toLowerCase().includes(termo) ||
      v.descricao.toLowerCase().includes(termo) ||
      v.codigoFornecedor.toLowerCase().includes(termo) ||
      v.cnpjFornecedor.toLowerCase().includes(termo)
    );
  }, [vinculos, termoBusca]);

  const excluirVinculo = (id: number) => {
    if (window.confirm('Tem a certeza que deseja excluir o vínculo deste fornecedor?')) {
      toast.success("Vínculo excluído com sucesso!");
      setVinculos(vinculos.filter(v => v.id !== id));
      setVinculoSelecionado(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          acoes={[
            {
              label: "Excluir",
              isDanger: true,
              onClick: () => {
                if (!vinculoSelecionado) {
                  toast.error("Selecione um vínculo visualizado na tabela.");
                  return;
                }
                excluirVinculo(vinculoSelecionado.id);
              }
            }
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded mt-2">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">SKU</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Descrição</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Código Fornecedor</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">CNPJ Fornecedor</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {vinculosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
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
                    <td className="px-4 py-2 font-bold text-gray-800">{v.sku}</td>
                    <td className="px-4 py-2 text-gray-800">{v.descricao}</td>
                    <td className="px-4 py-2 font-bold text-[#1a63b6]">{v.codigoFornecedor}</td>
                    <td className="px-4 py-2 text-gray-800">{v.cnpjFornecedor}</td>
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
