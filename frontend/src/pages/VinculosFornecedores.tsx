import { useState, useEffect } from 'react';
import { usePermissao } from '../hooks/usePermissao';
import { ActionToolbar } from '../components/ActionToolbar';
import toast from 'react-hot-toast';
import { vinculoFornecedorService } from '../services/vinculoFornecedorService';
import type { VinculoFornecedor } from '../services/vinculoFornecedorService';

export default function VinculosFornecedores() {
  const { temPermissao } = usePermissao();
  const [vinculos, setVinculos] = useState<VinculoFornecedor[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [vinculoSelecionado, setVinculoSelecionado] = useState<VinculoFornecedor | null>(null);

  useEffect(() => {
    carregarVinculos();
  }, []);

  const carregarVinculos = async (termo?: string) => {
    try {
      const dados = await vinculoFornecedorService.listar(termo);
      setVinculos(dados);
      setVinculoSelecionado(null);
    } catch (err) {
      console.error("Erro ao carregar vínculos", err);
      toast.error("Erro ao carregar os vínculos de fornecedor.");
    }
  };

  const excluirVinculo = async (id: number) => {
    if (window.confirm('Tem a certeza que deseja excluir o vínculo deste fornecedor?')) {
      try {
        await vinculoFornecedorService.excluir(id);
        toast.success("Vínculo excluído com sucesso!");
        await carregarVinculos(termoBusca);
      } catch (err) {
        console.error("Erro ao excluir", err);
        toast.error("Erro ao excluir o vínculo.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={(termo) => {
            setTermoBusca(termo);
            carregarVinculos(termo);
          }}
          acoes={[
            ...(temPermissao('CADASTROS.VINCULOS_FORNECEDOR') ? [
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
            ] : [])
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
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Criado Por</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {vinculos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhum vínculo encontrado.
                  </td>
                </tr>
              ) : (
                vinculos.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setVinculoSelecionado(v)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${vinculoSelecionado?.id === v.id ? "bg-blue-100" : ""
                      }`}
                  >
                    <td className="px-4 py-2 font-bold text-gray-800">{v.sku}</td>
                    <td className="px-4 py-2 text-gray-800">{v.descricao}</td>
                    <td className="px-4 py-2 font-bold text-[#1a63b6]">{v.codigoFornecedor}</td>
                    <td className="px-4 py-2 text-gray-800">{v.cnpjFornecedor}</td>
                    <td className="px-4 py-2 text-gray-500 italic">{v.criadoPor || '-'}</td>
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
