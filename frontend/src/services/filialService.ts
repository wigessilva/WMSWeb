import apiClient from './api';
import type { Filial, FilialCriar } from '../types/filial';

export const filialService = {
  listar: async (): Promise<Filial[]> => {
    const response = await apiClient.get('/filiais/');
    return response.data;
  },

  criar: async (filial: FilialCriar): Promise<Filial> => {
    const response = await apiClient.post('/filiais/', filial);
    return response.data;
  },

  atualizar: async (id: number, filial: Partial<FilialCriar>): Promise<Filial> => {
    const response = await apiClient.put(`/filiais/${id}`, filial);
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await apiClient.delete(`/filiais/${id}`);
  }
};