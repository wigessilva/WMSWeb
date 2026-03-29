import axios from 'axios';
import type { Recebimento } from '../types/recebimento';

// URL base atualizada para a porta 8005 e o prefixo definido no main.py
const api = axios.create({ baseURL: 'http://localhost:8005/recebimentos' });

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
  }
};