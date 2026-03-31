import axios from 'axios';
import type { Recebimento } from '../types/recebimento';

// URL padrão de fallback, caso o usuário ainda não tenha escolhido nenhuma
const api = axios.create({ baseURL: 'http://localhost:8005/recebimentos' });

// Adicionamos um interceptador que muda a URL base antes de a requisição sair
api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || 'http://localhost:8005';
  config.baseURL = `${urlServidorFilial}/recebimentos`;
  return config;
});

export const recebimentoService = {
  // Busca todos os recebimentos com os seus itens na base de dados
  listar: async (): Promise<Recebimento[]> => {
    const response = await api.get('/');
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
};
