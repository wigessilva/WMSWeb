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
  const [vinculosUnidades, setVinculosUnidades] = useState<VinculoUnidade[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarRecebimentos = async (termo?: string) => {
    try {
      const dados = await recebimentoService.listar(termo)
      setRecebimentos(dados)
      if (termo !== undefined) setRecebimentoSelecionado(null)
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

    // Carrega as unidades de medida para o Select do Modal e os vínculos globais
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

      // Atualiza a lista de vínculos silenciosamente para o botão sumir imediatamente
      vinculoUnidadeService.listar().then(setVinculosUnidades).catch(console.error)

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

  // Lógica de verificação de alta performance em memória
  const unidadesPendentes = recebimentoSelecionado ? recebimentoSelecionado.itens.filter(item => {
    const temDireto = unidadesInternas.some(u => u.sigla === item.und)
    const temVinculo = vinculosUnidades.some(v => v.unidade_externa === item.und)
    return !temDireto && !temVinculo
  }) : []

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
            ...(!recebimentoSelecionado || unidadesPendentes.length > 0 ? [{
              label: "Vincular Unidade",
              onClick: () => {
                if (!recebimentoSelecionado) {
                  toast.error("Selecione um romaneio na tabela.");
                  return;
                }
                const itemPendente = recebimentoSelecionado.itens.find(i => i.status.includes("Pendente"));
                if (itemPendente) {
                  setUnidadeExterna(itemPendente.und);
                } else if (recebimentoSelecionado.itens.length > 0) {
                  setUnidadeExterna(recebimentoSelecionado.itens[0].und);
                } else {
                  setUnidadeExterna("");
                }
                setModalUnidadeAberto(true);
              }
            }] : []),
            { label: "Vincular SKU", onClick: () => {} },
            { label: "Alterar Destino", onClick: () => {} }
          ]}
        />

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
                    onClick={() => setRecebimentoSelecionado(rec)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      recebimentoSelecionado?.id === rec.id ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 font-medium">#{rec.id}</td>
                    <td className="px-3 py-1.5 font-bold text-blue-900">{rec.nfe}</td>
                    <td className="px-3 py-1.5">{rec.oc || "-"}</td>
                    <td className="px-3 py-1.5">{rec.fornecedor}</td>
                    <td className="px-3 py-1.5">{rec.conferente || "-"}</td>
                    <td className="px-3 py-1.5">{rec.inicio ? new Date(rec.inicio).toLocaleDateString('pt-BR') : "-"}</td>
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
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-blue-800">{item.sku || "N/A"}</td>
                    <td className="px-3 py-1.5">{item.descricao}</td>
                    <td className="px-3 py-1.5 font-medium text-center">{item.qtd_nota}</td>
                    <td className="px-3 py-1.5 font-bold text-blue-600 text-center">{item.qtd_recebida || 0}</td>
                    <td className="px-3 py-1.5 text-center">{item.und}</td>
                    <td className="px-3 py-1.5">{item.lote || "-"}</td>
                    <td className="px-3 py-1.5">{item.fab ? new Date(item.fab).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">{item.val ? new Date(item.val).toLocaleDateString('pt-BR') : "-"}</td>
                    <td className="px-3 py-1.5">{item.vencimento || "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.int_embalagem || "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.int_material || "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.identificacao || "-"}</td>
                    <td className="px-3 py-1.5 text-center">{item.certif_qual || "-"}</td>
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
    </div>
  )
}