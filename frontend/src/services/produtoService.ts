import apiClient from './api';
import type { Produto } from '../types/produto';

export const produtoService = {
  listar: async (termo?: string): Promise<Produto[]> => {
    const response = await apiClient.get('/produtos/', { params: { busca: termo } });
    return response.data;
  },

  sincronizar: async (): Promise<{ inseridos: number, atualizados: number }> => {
    const response = await apiClient.post('/produtos/sincronizar-erp');
    return response.data;
  },

  editar: async (id: number, produto: Partial<Produto>): Promise<Produto> => {
    const response = await apiClient.put(`/produtos/${id}`, produto);
    return response.data;
  },

  editarUnidade: async (unidadeId: number, dados: any) => {
    const response = await apiClient.put(`/produtos/unidade/${unidadeId}`, dados);
    return response.data;
  },
  
  listarUnidades: async (produtoId: number) => {
    const response = await apiClient.get(`/produtos/${produtoId}/unidades`);
    return response.data;
  }
};