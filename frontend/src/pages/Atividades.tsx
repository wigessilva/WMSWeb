import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recebimentoService } from '../services/recebimentoService';
import { Button } from '../components/Button';
import { toast } from 'react-hot-toast';
import type { Recebimento } from '../types/recebimento';

export default function Atividades() {
  const [atividades, setAtividades] = useState<Recebimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipoAtividade, setTipoAtividade] = useState('recebimento');
  const navigate = useNavigate();

  // Obter o nome do usuário atual
  const usuarioInfo = sessionStorage.getItem('wms_sessao_usuario');
  const nomeUsuario = usuarioInfo ? JSON.parse(usuarioInfo).nome : 'Desconhecido';

  const carregarAtividades = async () => {
    setCarregando(true);
    try {
      const dados = await recebimentoService.listarAtividades();
      setAtividades(dados);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
      toast.error("Erro ao carregar atividades operacionais.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAtividades();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(carregarAtividades, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConferir = async (atividade: Recebimento) => {
    try {
      // Se já estiver em conferência pela mesma pessoa, apenas redireciona
      if (atividade.status === 'EM_CONFERENCIA' && atividade.conferente === nomeUsuario) {
        navigate(`/conferencia/${atividade.id}`);
        return;
      }
      
      // Se não, inicia a conferência na API (assumindo a tarefa)
      await recebimentoService.iniciarConferencia(atividade.id, nomeUsuario);
      toast.success("Atividade Assumida!");
      navigate(`/conferencia/${atividade.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Não foi possível iniciar esta conferência.");
      carregarAtividades(); // Atualiza a lista caso alguém tenha pego primeiro
    }
  };

  const atividadesFiltradas = atividades.filter(() => {
    // Filtro futuro: Se tivermos outras atividades (separação, inventário, etc.)
    return tipoAtividade === 'recebimento';
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Atividades Pendentes</h2>
        </div>
        <div>
          <select 
            value={tipoAtividade}
            onChange={(e) => setTipoAtividade(e.target.value)}
            className="border-2 border-blue-100 bg-blue-50 text-blue-900 rounded-lg p-2 font-bold focus:outline-none focus:border-blue-300"
          >
            <option value="recebimento">Recebimento</option>
            {/* Outras atividades entram aqui no futuro */}
          </select>
        </div>
      </div>

      {carregando && atividades.length === 0 ? (
        <div className="text-center py-10 text-gray-500 font-medium">Buscando atividades...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {atividadesFiltradas.length === 0 && (
            <div className="col-span-full bg-white p-10 rounded-xl border border-gray-200 border-dashed text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-bold text-gray-600">Nada pendente</h3>
              <p className="text-gray-400">Atualmente não há atividades deste tipo para iniciar.</p>
            </div>
          )}

          {atividadesFiltradas.map((atv) => {
            const emUsoPorOutro = atv.status === 'EM_CONFERENCIA' && atv.conferente && atv.conferente !== nomeUsuario;
            
            // Se estiver em uso por outro e a regra é ocultar (conforme o pedido da issue)
            if (emUsoPorOutro) return null;

            return (
              <div key={atv.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded uppercase tracking-wider">
                      Romaneio #{atv.id}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${atv.status === 'EM_CONFERENCIA' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {atv.status === 'EM_CONFERENCIA' ? 'Em Progresso' : 'Aguardando'}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{atv.fornecedor}</h3>
                  
                  <div className="flex space-x-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">NFe</p>
                      <p className="text-sm font-bold text-gray-800">{atv.nfe}</p>
                    </div>
                    {atv.oc && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">OC</p>
                        <p className="text-sm font-bold text-gray-800">{atv.oc}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="block text-xs text-gray-500 font-semibold mb-0.5">Quantidade</span>
                      <span className="font-bold text-[#1a63b6]">{atv.itens.length} SKUs</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-semibold mb-0.5">Início</span>
                      <span className="font-semibold text-gray-700">
                        {atv.inicio ? new Date(atv.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Aguardando...'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <Button 
                    variant="primary" 
                    className={`w-full py-3 text-base ${atv.status === 'EM_CONFERENCIA' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                    onClick={() => handleConferir(atv)}
                  >
                    {atv.status === 'EM_CONFERENCIA' ? 'Continuar Conferência' : 'Conferir'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
