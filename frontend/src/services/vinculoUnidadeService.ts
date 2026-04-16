import apiClient from './api';
import type { VinculoUnidade, VinculoUnidadeCriar } from '../types/vinculoUnidade';

export const vinculoUnidadeService = {
  listar: async (): Promise<VinculoUnidade[]> => {
    const response = await apiClient.get('/vinculos-unidade/');
    return response.data;
  },

  criar: async (dados: VinculoUnidadeCriar): Promise<VinculoUnidade> => {
    const response = await apiClient.post('/vinculos-unidade/', dados);
    return response.data;
  },

  atualizar: async (id: number, dados: VinculoUnidadeCriar): Promise<VinculoUnidade> => {
    const response = await apiClient.put(`/vinculos-unidade/${id}`, dados);
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await apiClient.delete(`/vinculos-unidade/${id}`);
  }
};