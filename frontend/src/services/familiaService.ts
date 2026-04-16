import apiClient from './api';
import type { Familia, FamiliaCriar } from '../types/familia';

export const familiaService = {
  listar: async (termo?: string): Promise<Familia[]> => {
    const response = await apiClient.get('/familias/', { params: { busca: termo } });
    return response.data;
  },

  criar: async (familia: FamiliaCriar): Promise<Familia> => {
    const response = await apiClient.post('/familias/', familia);
    return response.data;
  },

  atualizar: async (id: number, familia: Partial<FamiliaCriar>): Promise<Familia> => {
    const response = await apiClient.put(`/familias/${id}`, familia);
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await apiClient.delete(`/familias/${id}`);
  }
};