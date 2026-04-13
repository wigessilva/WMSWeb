import axios from 'axios';
import type { Recebimento } from '../types/recebimento';

const api = axios.create();

// Redireciona a requisição inteira para o IP do servidor da filial selecionada
api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;
  config.baseURL = `${urlServidorFilial}/recebimentos`;
  return config;
});

export const recebimentoService = {
  // Busca todos os recebimentos com os seus itens na base de dados (com busca opcional)
  listar: async (termo?: string): Promise<Recebimento[]> => {
    const params = termo ? { termo } : {};
    const response = await api.get('/', { params });
    return response.data;
  },

  listarAtividades: async (): Promise<Recebimento[]> => {
    const response = await api.get('/atividades');
    return response.data;
  },

  iniciarConferencia: async (id: number, conferenteId: string): Promise<Recebimento> => {
    const response = await api.post(`/${id}/iniciar-conferencia?conferente_id=${encodeURIComponent(conferenteId)}`);
    return response.data;
  },

  importar: async (dados: any, cnpj: string): Promise<Recebimento> => {
    const response = await api.post(`/importar?cnpj_fornecedor=${cnpj}`, dados);
    return response.data;
  },

  sincronizarOCsPendentes: async () => {
    const response = await api.post('/sincronizar-ocs');
    return response.data;
  },

  liberar: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/liberar`);
    return response.data;
  },

  cancelarLiberacao: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/cancelar-liberacao`);
    return response.data;
  },

  rejeitar: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/rejeitar`);
    return response.data;
  },

  concluirDoca: async (
    id: number, 
    rejeitados: { uas: string[], itens: number[] } = { uas: [], itens: [] },
    resolucoes_sobra: Record<number, string> = {}
  ): Promise<Recebimento> => {
    const response = await api.post(`/${id}/concluir-doca`, {
      uas_rejeitadas: rejeitados.uas,
      itens_rejeitados: rejeitados.itens,
      resolucoes_sobra
    });
    return response.data;
  },


  finalizar: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/finalizar`);
    return response.data;
  },

  autorizar: async (id: number, loginAutorizador: string, senhaAutorizador: string): Promise<Recebimento> => {
    const payload = {
      login_autorizador: loginAutorizador,
      senha_autorizador: senhaAutorizador
    };
    const response = await api.post(`/${id}/autorizar`, payload);
    return response.data;
  },

  vincularOC: async (id: number, oc: string) => {
    const response = await api.post(`/${id}/vincular-oc?oc=${oc}`);
    return response.data;
  },

  vincularUnidade: async (id: number, unidadeExterna: string, unidadeMedidaId: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/vincular-unidade`, null, {
      params: {
        unidade_externa: unidadeExterna,
        unidade_medida_id: unidadeMedidaId
      }
    });
    return response.data;
  },

  vincularSKU: async (recebimentoId: number, itemId: number, produtoId: number): Promise<Recebimento> => {
    const userJson = sessionStorage.getItem('wms_sessao_usuario');
    const usuarioNome = userJson ? JSON.parse(userJson).nome : null;

    const response = await api.post(`/${recebimentoId}/itens/${itemId}/vincular-sku`, null, {
      params: {
        produto_id: produtoId,
        ...(usuarioNome ? { criado_por: usuarioNome } : {})
      }
    });
    return response.data;
  },

  registrarLeitura: async (recebimentoId: number, itemId: number, leitura: any) => {
    const userJson = sessionStorage.getItem('wms_sessao_usuario');
    const user = userJson ? JSON.parse(userJson).nome : 'Coletor';
    const response = await api.post(`/${recebimentoId}/itens/${itemId}/registrar-leitura?usuario=${user}`, leitura);
    return response.data;
  },

  estornarLeitura: async (recebimentoId: number, itemId: number, ua: string) => {
    const userJson = sessionStorage.getItem('wms_sessao_usuario');
    const user = userJson ? JSON.parse(userJson).nome : 'Coletor';
    const response = await api.post(`/${recebimentoId}/itens/${itemId}/estornar-leitura?ua=${ua}&usuario=${user}`);
    return response.data;
  },

  registrarConferenciaItem: async (recebimentoId: number, itemId: number, dados: any) => {
    const userJson = sessionStorage.getItem('wms_sessao_usuario');
    const user = userJson ? JSON.parse(userJson).nome : 'Coletor';
    const response = await api.post(`/${recebimentoId}/itens/${itemId}/registrar-conferencia?usuario=${user}`, dados);
    return response.data;
  },

  solicitarReconferencia: async (recebimentoId: number, itemId: number, motivo?: string) => {
    const userJson = sessionStorage.getItem('wms_sessao_usuario');
    const user = userJson ? JSON.parse(userJson).nome : 'Coletor';
    const response = await api.post(`/${recebimentoId}/itens/${itemId}/solicitar-reconferencia?usuario=${user}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ''}`);
    return response.data;
  },
};
