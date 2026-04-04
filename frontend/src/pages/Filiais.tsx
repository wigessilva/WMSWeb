import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ActionToolbar } from '../components/ActionToolbar';
import { filialService } from '../services/filialService';
import type { Filial } from '../types/filial';
import toast from 'react-hot-toast';

export default function Filiais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [urlApi, setUrlApi] = useState('');
  const [isMatriz, setIsMatriz] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [erroNome, setErroNome] = useState('');

  // Controles de tela
  const [termoBusca, setTermoBusca] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [filialSelecionada, setFilialSelecionada] = useState<Filial | null>(null);

  const filiaisFiltradas = useMemo(() => {
    if (!termoBusca) return filiais;
    const termo = termoBusca.toLowerCase();
    return filiais.filter(f =>
      f.nome.toLowerCase().includes(termo) ||
      (f.cnpj && f.cnpj.includes(termo))
    );
  }, [filiais, termoBusca]);

  const carregarFiliais = async () => {
    try {
      const dados = await filialService.listar();
      setFiliais(dados);
    } catch (error) {
      console.error("Erro ao carregar filiais:", error);
    }
  };

  useEffect(() => {
    carregarFiliais();
  }, []);

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setNome('');
    setErroNome('');
    setCnpj('');
    setUrlApi('');
    setIsMatriz(false);
    setAtivo(true);
    setModalAberto(true);
  };

  const abrirModalEditar = () => {
    if (!filialSelecionada) {
      toast.error("Selecione uma filial");
      return;
    }
    setModoEdicao(true);
    setNome(filialSelecionada.nome);
    setErroNome('');
    setCnpj(filialSelecionada.cnpj || '');
    setUrlApi(filialSelecionada.url_api || '');
    setIsMatriz(filialSelecionada.is_matriz);
    setAtivo(filialSelecionada.ativo);
    setModalAberto(true);
  };

  const salvarFilial = async () => {
    if (!nome.trim()) {
      setErroNome("O nome da filial é obrigatório");
      return;
    }
    setErroNome("");

    setCarregando(true);
    const payload = {
      nome,
      cnpj: cnpj || null,
      url_api: urlApi || null,
      is_matriz: isMatriz,
      ativo
    };

    try {
      if (modoEdicao && filialSelecionada) {
        await filialService.atualizar(filialSelecionada.id, payload);
        alert("Filial atualizada com sucesso!");
      } else {
        await filialService.criar(payload);
        alert("Filial criada com sucesso!");
      }
      setModalAberto(false);
      carregarFiliais();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar filial");
    } finally {
      setCarregando(false);
    }
  };

  const excluirFilial = async (id: number, nomeFilial: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a filial ${nomeFilial}?`)) {
      try {
        await filialService.excluir(id);
        toast.success("Filial excluída com sucesso!");
        carregarFiliais();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir filial. Verifique se existem dependências.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          acoes={[
            { label: "Adicionar", onClick: abrirModalCriar },
            { label: "Editar", onClick: abrirModalEditar },
            {
              label: "Excluir",
              isDanger: true,
              onClick: () => {
                if (!filialSelecionada) {
                  toast.error("Selecione uma filial");
                  return;
                }
                excluirFilial(filialSelecionada.id, filialSelecionada.nome);
              }
            }
          ]}
        />

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">CNPJ</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200">URL API</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Tipo</th>
                <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {filiaisFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhuma filial encontrada.
                  </td>
                </tr>
              ) : (
                filiaisFiltradas.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setFilialSelecionada(f)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      filialSelecionada?.id === f.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-semibold text-blue-900">{f.nome}</td>
                    <td className="px-4 py-2">{f.cnpj || "-"}</td>
                    <td className="px-4 py-2">{f.url_api || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      {f.is_matriz ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold">Matriz</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">Filial</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {f.ativo ? (
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold">Ativo</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-semibold">Inativo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalAberto}>
          <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicao ? 'Editar Filial' : 'Criar Filial'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (e.target.value.trim()) setErroNome('');
                }}
                error={erroNome}
              />
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Opcional"
              />
              <Input
                label="URL API (Integração ERP)"
                value={urlApi}
                onChange={(e) => setUrlApi(e.target.value)}
                placeholder="Ex: http://192.168.1.100:8006"
              />

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={isMatriz} onChange={(e) => setIsMatriz(e.target.checked)} className="form-checkbox h-4 w-4 text-[#1a63b6] rounded border-gray-300 focus:ring-[#1a63b6]" />
                  <span className="text-sm font-medium text-gray-700">É Matriz?</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-600" />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" loading={carregando} onClick={salvarFilial}>Salvar</Button>
            </div>
          </div>
      </Modal>
    </div>
  );
}