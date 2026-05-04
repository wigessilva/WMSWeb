import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { ActionToolbar } from '../components/ActionToolbar';
import { enderecoService } from '../services/enderecoService';
import { filialService } from '../services/filialService';
import type { Area, EstruturaFisica, FinalidadeEndereco } from '../types/endereco';
import type { Filial } from '../types/filial';
import toast from 'react-hot-toast';

const Badge = ({ on }: { on: boolean }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${on ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{on ? 'Sim' : 'Não'}</span>
);





// ===================== ABA ÁREAS =====================
export function AbaAreas() {
  const [dados, setDados] = useState<Area[]>([]);
  const [sel, setSel] = useState<Area | null>(null);
  const [modal, setModal] = useState(false);
  const [sigla, setSigla] = useState('');
  const [desc, setDesc] = useState('');
  const [filialId, setFilialId] = useState(0);
  const [busca, setBusca] = useState('');
  const [filiais, setFiliais] = useState<Filial[]>([]);

  const carregar = async () => { 
    try { 
      const [areasRes, filiaisRes] = await Promise.all([
        enderecoService.listarAreas(),
        filialService.listar()
      ]);
      setDados(areasRes);
      setFiliais(filiaisRes);
      setSel(null); 
    } catch { 
      toast.error("Erro ao carregar dados."); 
    } 
  };
  useEffect(() => { carregar(); }, []);

  // Auto-seleciona a primeira filial ao carregar
  useEffect(() => {
    if (filialId === 0 && filiais.length > 0) {
      setFilialId(filiais[0].id);
    }
  }, [filiais, filialId]);

  const criar = async () => {
    if (!sigla.trim() || !desc.trim() || !filialId) { toast.error("Preencha todos os campos."); return; }
    try { await enderecoService.criarArea({ letra: sigla.toUpperCase(), descricao: desc, filial_id: filialId }); toast.success("Área criada!"); setModal(false); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const excluir = async () => {
    if (!sel) { toast.error("Selecione uma área."); return; }
    if (!window.confirm(`Excluir área "${sel.letra}"?`)) return;
    try { await enderecoService.excluirArea(sel.id); toast.success("Excluída!"); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const filtrados = busca ? dados.filter(a => a.letra.toLowerCase().includes(busca.toLowerCase()) || a.descricao.toLowerCase().includes(busca.toLowerCase())) : dados;

  const filialNome = (fId: number) => filiais.find(f => f.id === fId)?.nome || '-';

  return (
    <>
      <ActionToolbar termoBusca={busca} onBuscaChange={setBusca} acoes={[
        { label: "Adicionar", onClick: () => { setSigla(''); setDesc(''); setFilialId(filiais[0]?.id || 0); setModal(true); } },
        { label: "Excluir", isDanger: true, onClick: excluir },
      ]} />
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-700"><tr>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center w-24">Sigla</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200">Descrição</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200">Filial</th>
          </tr></thead>
          <tbody className="text-gray-600">
            {filtrados.length === 0 ? <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">Nenhuma área cadastrada.</td></tr> :
              filtrados.map(a => (
                <tr key={a.id} onClick={() => setSel(a)} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${sel?.id === a.id ? 'bg-blue-100' : ''}`}>
                  <td className="px-4 py-2 text-center"><span className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 font-bold">{a.letra}</span></td>
                  <td className="px-4 py-2">{a.descricao}</td>
                  <td className="px-4 py-2 text-gray-500">{filialNome(a.filial_id)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="space-y-4">
            <Input label="Sigla" maxLength={5} value={sigla} onChange={e => setSigla(e.target.value.toUpperCase())} placeholder="Ex: A" />
            <Input label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Mezanino Bloco 1" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
              <select value={filialId} onChange={e => setFilialId(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-sm">
                {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={criar}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ===================== ABA ESTRUTURAS =====================
export function AbaEstruturas() {
  const [dados, setDados] = useState<EstruturaFisica[]>([]);
  const [sel, setSel] = useState<EstruturaFisica | null>(null);
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState('');
  const [palete, setPalete] = useState(false);
  const [caixa, setCaixa] = useState(false);
  const [log, setLog] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = async () => { try { setDados(await enderecoService.listarEstruturas()); setSel(null); } catch { toast.error("Erro ao carregar."); } };
  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!nome.trim()) { toast.error("Preencha o nome."); return; }
    try { await enderecoService.criarEstrutura({ nome, comporta_palete: palete, comporta_caixa: caixa, comporta_log: log }); toast.success("Estrutura criada!"); setModal(false); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const excluir = async () => {
    if (!sel) { toast.error("Selecione uma estrutura."); return; }
    if (!window.confirm(`Excluir "${sel.nome}"?`)) return;
    try { await enderecoService.excluirEstrutura(sel.id); toast.success("Excluída!"); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const filtrados = busca ? dados.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase())) : dados;

  return (
    <>
      <ActionToolbar termoBusca={busca} onBuscaChange={setBusca} acoes={[
        { label: "Adicionar", onClick: () => { setNome(''); setPalete(false); setCaixa(false); setLog(false); setModal(true); } },
        { label: "Excluir", isDanger: true, onClick: excluir },
      ]} />
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-700"><tr>
            <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Palete</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Caixa</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Log</th>
          </tr></thead>
          <tbody className="text-gray-600">
            {filtrados.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhuma estrutura cadastrada.</td></tr> :
              filtrados.map(e => (
                <tr key={e.id} onClick={() => setSel(e)} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${sel?.id === e.id ? 'bg-blue-100' : ''}`}>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-xs font-semibold">{e.nome}</span></td>
                  <td className="px-4 py-2 text-center"><Badge on={e.comporta_palete} /></td>
                  <td className="px-4 py-2 text-center"><Badge on={e.comporta_caixa} /></td>
                  <td className="px-4 py-2 text-center"><Badge on={e.comporta_log} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="space-y-4">
            <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Porta-Palete Convencional" />
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Comporta</p>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Palete</span><ToggleSwitch checked={palete} onChange={setPalete} labelOn="" labelOff="" /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Caixa</span><ToggleSwitch checked={caixa} onChange={setCaixa} labelOn="" labelOff="" /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Log</span><ToggleSwitch checked={log} onChange={setLog} labelOn="" labelOff="" /></div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={criar}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ===================== ABA FINALIDADES =====================
export function AbaFinalidades() {
  const [dados, setDados] = useState<FinalidadeEndereco[]>([]);
  const [sel, setSel] = useState<FinalidadeEndereco | null>(null);
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState('');
  const [pulmao, setPulmao] = useState(false);
  const [picking, setPicking] = useState(false);
  const [quarentena, setQuarentena] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = async () => { try { setDados(await enderecoService.listarFinalidades()); setSel(null); } catch { toast.error("Erro ao carregar."); } };
  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!nome.trim()) { toast.error("Preencha o nome."); return; }
    try { await enderecoService.criarFinalidade({ nome, tipo_pulmao: pulmao, tipo_picking: picking, tipo_quarentena: quarentena }); toast.success("Finalidade criada!"); setModal(false); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const excluir = async () => {
    if (!sel) { toast.error("Selecione uma finalidade."); return; }
    if (!window.confirm(`Excluir "${sel.nome}"?`)) return;
    try { await enderecoService.excluirFinalidade(sel.id); toast.success("Excluída!"); carregar(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro."); }
  };

  const filtrados = busca ? dados.filter(f => f.nome.toLowerCase().includes(busca.toLowerCase())) : dados;

  return (
    <>
      <ActionToolbar termoBusca={busca} onBuscaChange={setBusca} acoes={[
        { label: "Adicionar", onClick: () => { setNome(''); setPulmao(false); setPicking(false); setQuarentena(false); setModal(true); } },
        { label: "Excluir", isDanger: true, onClick: excluir },
      ]} />
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-700"><tr>
            <th className="px-4 py-3 font-semibold border-b border-gray-200">Nome</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Pulmão</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Picking</th>
            <th className="px-4 py-3 font-semibold border-b border-gray-200 text-center">Quarentena</th>
          </tr></thead>
          <tbody className="text-gray-600">
            {filtrados.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhuma finalidade cadastrada.</td></tr> :
              filtrados.map(f => (
                <tr key={f.id} onClick={() => setSel(f)} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${sel?.id === f.id ? 'bg-blue-100' : ''}`}>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    f.tipo_picking ? 'bg-amber-100 text-amber-800' : f.tipo_quarentena ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>{f.nome}</span></td>
                  <td className="px-4 py-2 text-center"><Badge on={f.tipo_pulmao} /></td>
                  <td className="px-4 py-2 text-center"><Badge on={f.tipo_picking} /></td>
                  <td className="px-4 py-2 text-center"><Badge on={f.tipo_quarentena} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal}>
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 max-w-sm w-full">
          <div className="space-y-4">
            <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pulmão Convencional" />
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tipo</p>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Pulmão</span><ToggleSwitch checked={pulmao} onChange={setPulmao} labelOn="" labelOff="" /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Picking</span><ToggleSwitch checked={picking} onChange={setPicking} labelOn="" labelOff="" /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Quarentena</span><ToggleSwitch checked={quarentena} onChange={setQuarentena} labelOn="" labelOff="" /></div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={criar}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
