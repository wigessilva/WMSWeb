import { useState, useEffect, useRef } from 'react'
import { recebimentoService } from '../services/recebimentoService'
import { configuracaoService } from '../services/configuracaoService'
import { unidadeMedidaService } from '../services/unidadeMedidaService'
import { vinculoUnidadeService } from '../services/vinculoUnidadeService'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ActionToolbar } from '../components/ActionToolbar'
import type { VinculoUnidade } from '../types/vinculoUnidade'
import type { Recebimento } from '../types/recebimento'
import type { UnidadeMedida } from '../types/unidadeMedida'
import { toast } from 'react-hot-toast'

export default function Recebimentos() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [recebimentoSelecionado, setRecebimentoSelecionado] = useState<Recebimento | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")

  const [caminhoPasta, setCaminhoPasta] = useState("")
  const [modalConfigAberto, setModalConfigAberto] = useState(false)
  const [modalOCAberto, setModalOCAberto] = useState(false)
  const [ocDigitada, setOcDigitada] = useState("")

  // Novos estados para Vincular Unidade
  const [modalUnidadeAberto, setModalUnidadeAberto] = useState(false)
  const [unidadeExterna, setUnidadeExterna] = useState("")
  const [unidadeInternaId, setUnidadeInternaId] = useState<number | "">("")
  const [unidadesInternas, setUnidadesInternas] = useState<UnidadeMedida[]>([])
  const [vinculosUnidades, setVinculosUnidades] = useState<any[]>([])

  // Novos estados para Vincular SKU
  const [modalSKUAberto, setModalSKUAberto] = useState(false)
  const [itemSelecionadoParaSKU, setItemSelecionadoParaSKU] = useState<any>(null)
  const [sugestaoMensagem, setSugestaoMensagem] = useState<string | null>(null)
  const [carregandoSugestao, setCarregandoSugestao] = useState(false)
  const [itemSelecionadoNaTabela, setItemSelecionadoNaTabela] = useState<any>(null)
  const [modalPainelAberto, setModalPainelAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'conferencia'>('painel')

  // Estados para Async Combobox de Produtos
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<number | null>(null);
  const [produtosSugeridos, setProdutosSugeridos] = useState<{ id: number, sku: string, descricao: string }[]>([]);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);



  const carregarRecebimentos = async (termo?: string) => {
    try {
      const dados = await recebimentoService.listar(termo)
      setRecebimentos(dados)
      if (termo !== undefined) {
        setRecebimentoSelecionado(null)
        setItemSelecionadoNaTabela(null)
      }
    } catch (error) {
      console.error("Erro ao carregar notas:", error)
      toast.error("Erro ao carregar as notas. Verifique a conexão com o servidor")
    }
  }

  useEffect(() => {
    carregarRecebimentos()

    configuracaoService.getRoboConfig().then(dados => {
      setCaminhoPasta(dados.caminho_diretorio || "")
    }).catch(err => console.error("Erro ao carregar configuração inicial", err))

    // Carrega as unidades de medida para o Select do Modal
    unidadeMedidaService.listar().then(setUnidadesInternas).catch(console.error)
    vinculoUnidadeService.listar().then(setVinculosUnidades).catch(console.error)
  }, [])

  const guardarConfiguracao = async () => {
    try {
      await configuracaoService.updateRoboConfig(caminhoPasta)
      toast.success("Configuração guardada com sucesso! O robô já sabe onde procurar.")
      setModalConfigAberto(false)
    } catch (error) {
      console.error("Detalhes do erro:", error)
      toast.error("Erro ao guardar configuração.")
    }
  }

  const salvarOC = async () => {
    if (!recebimentoSelecionado) return
    if (!ocDigitada || ocDigitada.trim() === "") {
      toast.error("Por favor, digite uma OC válida.")
      return
    }

    setCarregando(true)
    try {
      const recAtualizado = await recebimentoService.vincularOC(recebimentoSelecionado.id, ocDigitada)
      const novosRecebimentos = recebimentos.map(rec => rec.id === recebimentoSelecionado.id ? recAtualizado : rec)

      setRecebimentos(novosRecebimentos)
      setRecebimentoSelecionado(recAtualizado)
      toast.success(`OC ${ocDigitada} vinculada com sucesso!`)
      setModalOCAberto(false)
    } catch (error) {
      console.error("Erro ao buscar OC:", error)
      toast.error("Erro na comunicação com o servidor ou OC não encontrada.")
    } finally {
      setCarregando(false)
    }
  }

  const salvarVinculoUnidade = async () => {
    if (!recebimentoSelecionado) return
    if (!unidadeExterna || !unidadeInternaId) {
      toast.error("Preencha a sigla externa e selecione a unidade interna.")
      return
    }

    setCarregando(true)
    try {
      const recAtualizado = await recebimentoService.vincularUnidade(
        recebimentoSelecionado.id,
        unidadeExterna,
        Number(unidadeInternaId)
      )

      const novosRecebimentos = recebimentos.map(rec => rec.id === recebimentoSelecionado.id ? recAtualizado : rec)
      setRecebimentos(novosRecebimentos)
      setRecebimentoSelecionado(recAtualizado)

      toast.success("Unidade vinculada e itens atualizados com sucesso!")
      setModalUnidadeAberto(false)
      setUnidadeExterna("")
      setUnidadeInternaId("")
    } catch (error) {
      console.error("Erro ao vincular unidade:", error)
      toast.error("Erro ao vincular a unidade. Verifique o servidor.")
    } finally {
      setCarregando(false)
    }
  }

  const salvarVinculoSKU = async () => {
    if (!recebimentoSelecionado || !itemSelecionadoParaSKU) return;
    if (!produtoSelecionadoId) {
      toast.error("Por favor, pesquise e selecione um produto válido da lista.");
      return;
    }

    setCarregando(true);
    try {
      const recAtualizado = await recebimentoService.vincularSKU(
        recebimentoSelecionado.id,
        itemSelecionadoParaSKU.id,
        produtoSelecionadoId
      );

      const novosRecebimentos = recebimentos.map(rec => rec.id === recebimentoSelecionado.id ? recAtualizado : rec);
      setRecebimentos(novosRecebimentos);
      setRecebimentoSelecionado(recAtualizado);

      toast.success("SKU vinculado com sucesso!");
      setModalSKUAberto(false);
      setBuscaProduto("");
      setProdutoSelecionadoId(null);
      setProdutosSugeridos([]);
      setSugestaoMensagem(null);
    } catch (error: any) {
      console.error("Erro ao vincular SKU:", error);
      toast.error(error.response?.data?.detail || "Erro ao vincular o SKU. Verifique o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  const sincronizarEAtualizar = async () => {
    setCarregando(true)
    try {
      await recebimentoService.sincronizarOCsPendentes()
      await carregarRecebimentos()
      toast.success("Sincronização concluída com sucesso!")
    } catch (error) {
      console.error("Erro na sincronização:", error)
      toast.error("Erro ao sincronizar com o ERP")
    } finally {
      setCarregando(false)
    }
  }

  // --- Funções do Painel de Controle ---

  const handleLiberar = async () => {
    if (!recebimentoSelecionado) return;
    setCarregando(true);
    try {
      const rec = await recebimentoService.liberar(recebimentoSelecionado.id);
      setRecebimentoSelecionado(rec);
      setRecebimentos(recebimentos.map(r => r.id === rec.id ? rec : r));
      toast.success("Conferência liberada. Disponível no coletor!");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Erro ao liberar");
    } finally {
      setCarregando(false);
    }
  }

  const handleCancelarLiberacao = async () => {
    if (!recebimentoSelecionado) return;
    if (!confirm("Tem a certeza que deseja cancelar? (Leituras serão zeradas)")) return;
    setCarregando(true);
    try {
      const rec = await recebimentoService.cancelarLiberacao(recebimentoSelecionado.id);
      setRecebimentoSelecionado(rec);
      setRecebimentos(recebimentos.map(r => r.id === rec.id ? rec : r));
      toast.success("Liberação cancelada. A nota voltou para a fila do Painel.");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Erro ao cancelar liberação");
    } finally {
      setCarregando(false);
    }
  }

  const handleRejeitar = async () => {
    if (!recebimentoSelecionado) return;
    if (!confirm("Tem a certeza que deseja rejeitar este recebimento inteiramente? Esta ação é final.")) return;
    setCarregando(true);
    try {
      const rec = await recebimentoService.rejeitar(recebimentoSelecionado.id);
      setRecebimentoSelecionado(rec);
      setRecebimentos(recebimentos.map(r => r.id === rec.id ? rec : r));
      toast.success("Recebimento rejeitado definitivamente!");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Erro ao rejeitar recebimento");
    } finally {
      setCarregando(false);
    }
  }

  const handleConcluir = async () => {
    if (!recebimentoSelecionado) return;
    setCarregando(true);
    try {
      const rec = await recebimentoService.concluirDoca(recebimentoSelecionado.id);
      setRecebimentoSelecionado(rec);
      setRecebimentos(recebimentos.map(r => r.id === rec.id ? rec : r));
      toast.success("Recebimento concluído com sucesso!");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Erro ao concluir doca");
    } finally {
      setCarregando(false);
    }
  }

  // Regras de Exibição dos Botões
  const temDireto = itemSelecionadoNaTabela ? unidadesInternas.some(u => u.sigla === itemSelecionadoNaTabela.und) : true;
  const temVinculo = itemSelecionadoNaTabela ? vinculosUnidades.some(v => v.unidade_externa === itemSelecionadoNaTabela.und) : true;

  const precisaVincularUnidade = itemSelecionadoNaTabela && !temDireto && !temVinculo;
  const precisaVincularSKU = itemSelecionadoNaTabela && !itemSelecionadoNaTabela.sku;

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <ActionToolbar
          termoBusca={termoBusca}
          onBuscaChange={(termo) => {
            setTermoBusca(termo);
            carregarRecebimentos(termo);
          }}
          acoes={[
            { label: "Atualizar", onClick: sincronizarEAtualizar },
            { label: "Configurar Pasta XML", onClick: () => setModalConfigAberto(true) },
            {
              label: "Editar OC",
              onClick: () => {
                if (!recebimentoSelecionado) {
                  toast.error("Selecione um romaneio na tabela para editar a OC.");
                  return;
                }
                setOcDigitada(recebimentoSelecionado.oc || "");
                setModalOCAberto(true);
              }
            },
            ...(precisaVincularUnidade ? [
              {
                label: "Vincular Unidade",
                onClick: () => {
                  setUnidadeExterna(itemSelecionadoNaTabela.und);
                  setModalUnidadeAberto(true);
                }
              }
            ] : []),
            ...(precisaVincularSKU ? [
              {
                label: "Vincular SKU",
                onClick: () => {
                  const item = itemSelecionadoNaTabela;
                  setItemSelecionadoParaSKU(item);
                  setModalSKUAberto(true);

                  setCarregandoSugestao(true);
                  setSugestaoMensagem(null);
                  fetch(`http://localhost:8000/recebimentos/${recebimentoSelecionado?.id}/itens/${item.id}/sugestao-sku`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.sugestao) {
                        const p = data.sugestao;
                        setBuscaProduto(`${p.sku} - ${p.descricao}`);
                        setProdutoSelecionadoId(p.id);
                        setSugestaoMensagem(data.mensagem);
                      } else {
                        setProdutoSelecionadoId(null);
                        setSugestaoMensagem(data.mensagem || "Nenhuma sugestão encontrada.");
                      }
                    })
                    .catch(err => {
                      console.error("Erro ao buscar sugestão", err);
                      setSugestaoMensagem("Erro ao buscar sugestão automática.");
                    })
                    .finally(() => setCarregandoSugestao(false));
                }
              }
            ] : []),
            ...(itemSelecionadoNaTabela ? [
              { label: "Alterar Destino", onClick: () => { } }
            ] : []),
            // Ações do Recebimento (FSM)
            ...(recebimentoSelecionado && recebimentoSelecionado.status === 'AGUARDANDO_LIBERACAO' ? [
              { label: "Liberar Conferência", onClick: handleLiberar, className: "text-green-600 font-bold" }
            ] : []),
            ...(recebimentoSelecionado && (recebimentoSelecionado.status === 'AGUARDANDO_CONFERENCIA' || recebimentoSelecionado.status === 'EM_CONFERENCIA') ? [
              { label: "Cancelar Conferência", onClick: handleCancelarLiberacao }
            ] : []),
            ...(recebimentoSelecionado && ['EM_CONFERENCIA', 'AGUARDANDO_CONFERENCIA'].includes(recebimentoSelecionado.status) && recebimentoSelecionado.itens.every(i => i.status === 'CONFERIDO' || i.status === 'DIVERGENTE') ? [
              { label: "Concluir Doca", onClick: handleConcluir, className: "text-blue-600 font-bold" }
            ] : []),
            ...(recebimentoSelecionado && !['FINALIZADO', 'REJEITADO', 'CONCLUIDO'].includes(recebimentoSelecionado.status) ? [
              { label: "Rejeitar Recebimento", onClick: handleRejeitar, className: "text-red-600" }
            ] : [])
          ]}
        >
          {recebimentoSelecionado && (
            <button
              onClick={() => setModalPainelAberto(true)}
              className="bg-white text-[#1a63b6] border border-[#1a63b6] px-4 py-1.5 rounded hover:bg-blue-50 transition-colors text-sm font-bold flex items-center shadow-sm ml-2"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Painel
            </button>
          )}
        </ActionToolbar>

        <div className="overflow-y-auto max-h-72 border border-gray-200 rounded">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50 shadow-sm">
              <tr className="text-gray-700 text-sm">
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Romaneio</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">NFe</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">OC</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Fornecedor</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Conferente</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Início</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Conclusão</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {recebimentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                    Nenhuma nota encontrada.
                  </td>
                </tr>
              ) : (
                recebimentos.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => {
                      setRecebimentoSelecionado(rec);
                      setItemSelecionadoNaTabela(null);
                    }}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${recebimentoSelecionado?.id === rec.id ? "bg-blue-100" : ""
                      }`}
                  >
                    <td className="px-3 py-1.5 font-medium">#{rec.id}</td>
                    <td className="px-3 py-1.5 font-bold text-blue-900">{rec.nfe}</td>
                    <td className="px-3 py-1.5">{rec.oc || "-"}</td>
                    <td className="px-3 py-1.5">{rec.fornecedor}</td>
                    <td className="px-3 py-1.5">{rec.conferente_id || "-"}</td>
                    <td className="px-3 py-1.5">{rec.data_inicio ? new Date(rec.data_inicio).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">{rec.conclusao ? new Date(rec.conclusao).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 min-h-[300px]">
        {!recebimentoSelecionado ? (
          <div className="flex items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-200 rounded">
            Selecione um romaneio na tabela acima para ver os seus itens.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 text-sm">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">SKU</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Descrição</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Qtd Nota</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Qtd Recebida</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Und</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Lote</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Fab</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Val</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Vencimento</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Int. Embalagem</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Int. Material</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Identificação</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Certif. Qualidade</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Destino</th>
                  <th className="px-3 py-2 font-semibold border-b border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {recebimentoSelecionado.itens.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setItemSelecionadoNaTabela(item)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-yellow-50 transition-colors ${itemSelecionadoNaTabela?.id === item.id ? "bg-yellow-100" : ""
                      }`}
                  >
                    <td className="px-3 py-1.5 font-medium text-blue-800">{item.sku || "N/A"}</td>
                    <td className="px-3 py-1.5">{item.descricao}</td>
                    <td className="px-3 py-1.5 font-medium text-center">{item.qtd_nota}</td>
                    <td className="px-3 py-1.5 font-bold text-blue-600 text-center">{item.qtd_recebida || 0}</td>
                    <td className="px-3 py-1.5 text-center">{item.und}</td>
                    <td className="px-3 py-1.5">{item.lote || "-"}</td>
                    <td className="px-3 py-1.5">{item.data_fabricacao ? new Date(item.data_fabricacao).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">{item.data_validade ? new Date(item.data_validade).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">{item.data_vencimento || "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.integridade_embalagem !== null ? (item.integridade_embalagem ? "Sim" : "Não") : "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.integridade_material !== null ? (item.integridade_material ? "Sim" : "Não") : "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.identificacao !== null ? (item.identificacao ? "Sim" : "Não") : "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.certificado_qualidade !== null ? (item.certificado_qualidade ? "Sim" : "Não") : "-"}</td>
                    <td className="px-3 py-1.5">{item.destino || "-"}</td>
                    <td className="px-3 py-1.5">
                      <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalConfigAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-wms-sidebar">Configurar Pasta XML</h3>
            <button onClick={() => setModalConfigAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>
          <div className="mb-6">
            <Input label="Caminho da Pasta de Origem" value={caminhoPasta} onChange={(e) => setCaminhoPasta(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="secondary" onClick={() => setModalConfigAberto(false)}>Cancelar</Button>
            <Button variant="primary" onClick={guardarConfiguracao}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOCAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-wms-sidebar">Editar Ordem de Compra</h3>
            <button onClick={() => setModalOCAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>
          <div className="mb-6">
            <Input label="Número da OC no ERP" value={ocDigitada} onChange={(e) => setOcDigitada(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="secondary" onClick={() => setModalOCAberto(false)}>Cancelar</Button>
            <Button variant="primary" loading={carregando} loadingText="Buscando..." onClick={salvarOC}>Buscar e Vincular</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalUnidadeAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-wms-sidebar">Vincular Unidade</h3>
            <button onClick={() => setModalUnidadeAberto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sigla no XML</label>
              <input
                type="text"
                value={unidadeExterna}
                readOnly
                className="w-full border border-gray-300 p-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Interna</label>
              <select
                value={unidadeInternaId}
                onChange={(e) => setUnidadeInternaId(Number(e.target.value))}
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
              >
                <option value="">Selecione...</option>
                {unidadesInternas.map(u => (
                  <option key={u.id} value={u.id}>{u.sigla} - {u.desc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setModalUnidadeAberto(false)}>Cancelar</Button>
            <Button variant="primary" loading={carregando} onClick={salvarVinculoUnidade}>Salvar Vínculo</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL VINCULAR SKU */}
      <Modal isOpen={modalSKUAberto}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-xl w-full" style={{ minHeight: "400px" }}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-wms-sidebar">Vincular SKU</h3>
            <button onClick={() => { setModalSKUAberto(false); setBuscaProduto(""); setProdutoSelecionadoId(null); setProdutosSugeridos([]); setSugestaoMensagem(null); }} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700">
              <div className="mb-2"><span className="font-semibold text-gray-800">Nota Fiscal:</span> {recebimentoSelecionado?.nfe}</div>
              <div className="mb-2"><span className="font-semibold text-gray-800">Código do Produto:</span> {itemSelecionadoParaSKU?.codigo_fornecedor || "N/A"}</div>
              <div><span className="font-semibold text-gray-800">Descrição:</span> {itemSelecionadoParaSKU?.descricao || "N/A"}</div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Produto</label>
              <input
                type="text"
                placeholder="Digite ao menos 3 letras para buscar..."
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
                value={buscaProduto}
                onChange={(e) => {
                  const termo = e.target.value;
                  setBuscaProduto(termo);
                  setProdutoSelecionadoId(null);

                  if (debounceTimer.current) clearTimeout(debounceTimer.current);

                  if (termo.length >= 3) {
                    setBuscandoProdutos(true);
                    debounceTimer.current = setTimeout(async () => {
                      try {
                        const res = await fetch(`http://localhost:8000/produtos/?busca=${encodeURIComponent(termo)}`);
                        if (res.ok) {
                          const data = await res.json();
                          setProdutosSugeridos(data);
                        }
                      } catch (err) {
                        console.error("Erro ao buscar produtos", err);
                      } finally {
                        setBuscandoProdutos(false);
                      }
                    }, 500);
                  } else {
                    setProdutosSugeridos([]);
                    setBuscandoProdutos(false);
                  }
                }}
              />

              {buscandoProdutos && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 text-sm text-gray-500 text-center">
                  Buscando...
                </div>
              )}

              {!buscandoProdutos && produtosSugeridos.length > 0 && buscaProduto.length >= 3 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                  {produtosSugeridos.map(prod => (
                    <li
                      key={prod.id}
                      className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                      onClick={() => {
                        setBuscaProduto(`${prod.sku} - ${prod.descricao}`);
                        setProdutoSelecionadoId(prod.id);
                        setProdutosSugeridos([]);
                      }}
                    >
                      <span className="font-bold text-gray-800">{prod.sku}</span> - {prod.descricao}
                    </li>
                  ))}
                </ul>
              )}

              {carregandoSugestao && <div className="text-sm text-gray-500 mt-2">Buscando sugestão automática...</div>}
              {!carregandoSugestao && sugestaoMensagem && (
                <div className={`text-sm mt-3 p-2 rounded border font-medium ${sugestaoMensagem.includes('Sugestão:') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                  💡 {sugestaoMensagem}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-10">
            <Button variant="secondary" onClick={() => { setModalSKUAberto(false); setBuscaProduto(""); setProdutoSelecionadoId(null); setProdutosSugeridos([]); setSugestaoMensagem(null); }}>Cancelar</Button>
            <Button variant="primary" loading={carregando} onClick={salvarVinculoSKU}>Vincular</Button>
          </div>
        </div>
      </Modal>
      {/* MODAL PAINEL DE CONTROLE */}
      <Modal isOpen={modalPainelAberto}>
        <div className="bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 max-w-4xl w-full">
          <div className="flex justify-between items-center border-b border-gray-200 mb-6">
            {/* ABAS */}
            <div className="flex">
              <button
                onClick={() => setAbaAtiva('painel')}
                className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[2px] ${abaAtiva === 'painel' ? 'border-[#1a63b6] text-[#1a63b6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Painel
              </button>
              <button
                onClick={() => setAbaAtiva('conferencia')}
                className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[2px] ${abaAtiva === 'conferencia' ? 'border-[#1a63b6] text-[#1a63b6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Conferência
              </button>
            </div>
            <button onClick={() => { setModalPainelAberto(false); setAbaAtiva('painel'); }} className="text-gray-400 hover:text-red-500 font-bold text-2xl transition-colors">&times;</button>
          </div>

          {recebimentoSelecionado && (() => {
            const isFinanceiroOK = !!recebimentoSelecionado.oc;
            const itensPendentesFisico = recebimentoSelecionado.itens.filter(i => !i.sku || i.status === 'PENDENTE_VINCULO');
            const isFisicoOK = itensPendentesFisico.length === 0;
            const isQualidadeOK = recebimentoSelecionado.status !== 'BLOQUEADO';
            const isTudoOK = isFinanceiroOK && isFisicoOK && isQualidadeOK;

            let vereditoTexto = "Pronto para Conferência";
            let vereditoCor = "bg-green-100 text-green-800 border-green-200";
            let vereditoIcone = (
              <svg className="w-6 h-6 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            );

            if (!isTudoOK) {
              vereditoCor = "bg-yellow-100 text-yellow-800 border-yellow-200";
              vereditoIcone = (
                <svg className="w-6 h-6 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              );
              
              if (!isFinanceiroOK) vereditoTexto = "Verifique as pendências em Financeiro";
              else if (!isFisicoOK) vereditoTexto = "Verifique as pendências em Físico";
              else if (!isQualidadeOK) vereditoTexto = "Verifique as pendências em Qualidade";
            }

            const multiItens = recebimentoSelecionado.itens.length > 1;
            const getPrefixoItem = (item: any) => multiItens ? `${item.sku || item.codigo_fornecedor}: ` : "";

            return (
              <div className="space-y-6">
                {abaAtiva === 'painel' ? (
                  <>
                    <div className={`flex items-center p-4 rounded-lg border font-bold text-lg shadow-sm ${vereditoCor}`}>
                      {vereditoIcone}
                      {vereditoTexto}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card FINANCEIRO */}
                      <div className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${!isFinanceiroOK ? 'border-yellow-300 ring-1 ring-yellow-300' : 'border-gray-100'}`}>
                        <div className="flex items-center mb-3">
                          <div className={`p-2 rounded-lg mr-2 ${isFinanceiroOK ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 14c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Financeiro</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Vínculo com Ordem de Compra.</p>
                        <div className={`text-sm font-bold ${isFinanceiroOK ? 'text-green-600' : 'text-yellow-600'}`}>
                          {isFinanceiroOK ? 'OC ' + recebimentoSelecionado.oc : 'OC Não Localizada'}
                        </div>
                      </div>

                      {/* Card FÍSICO */}
                      <div className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${!isFisicoOK ? 'border-yellow-300 ring-1 ring-yellow-300' : 'border-gray-100'}`}>
                        <div className="flex items-center mb-3">
                          <div className={`p-2 rounded-lg mr-2 ${isFisicoOK ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Físico</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Vínculos de SKUs.</p>
                        <div className={`text-sm font-bold ${isFisicoOK ? 'text-green-600' : 'text-yellow-600'}`}>
                          {isFisicoOK ? 'Vínculos OK' : (
                            <div className="flex flex-col space-y-1">
                              {itensPendentesFisico.map(item => (
                                <span key={item.id}>{getPrefixoItem(item)}Aguardando Vínculo</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card QUALIDADE */}
                      <div className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${!isQualidadeOK ? 'border-yellow-300 ring-1 ring-yellow-300' : 'border-gray-100'}`}>
                        <div className="flex items-center mb-3">
                          <div className={`p-2 rounded-lg mr-2 ${isQualidadeOK ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Qualidade</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Inspeção técnica.</p>
                        <div className={`text-sm font-bold ${isQualidadeOK ? 'text-green-600' : 'text-yellow-600'}`}>
                          {isQualidadeOK ? 'Liberado' : 'Nota Bloqueada'}
                        </div>
                      </div>
                    </div>

                  </>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-bold border-b border-gray-200">SKU</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-200">Descrição</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-200 text-center">Progresso</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-200">Status</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-200">Conferente</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 text-sm">
                        {recebimentoSelecionado.itens.map((item) => {
                          const progresso = Math.min(100, Math.round(((item.qtd_recebida || 0) / item.qtd_nota) * 100));
                          return (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-[#1a63b6]">{item.sku || "---"}</td>
                              <td className="px-4 py-3 max-w-xs truncate">{item.descricao}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2 min-w-[80px]">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-500 ${progresso === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                      style={{ width: `${progresso}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold w-8">{progresso}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.status === 'CONFERIDO' ? 'bg-green-100 text-green-700' :
                                  item.status === 'DIVERGENTE' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs italic text-gray-400">
                                {recebimentoSelecionado.conferente_id || "Não atribuído"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={() => { setModalPainelAberto(false); setAbaAtiva('painel'); }}>Fechar Painel</Button>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>
    </div>
  )
}