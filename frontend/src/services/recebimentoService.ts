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

  concluirDoca: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/concluir-doca`);
    return response.data;
  },

  finalizar: async (id: number): Promise<Recebimento> => {
    const response = await api.post(`/${id}/finalizar`);
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
};
