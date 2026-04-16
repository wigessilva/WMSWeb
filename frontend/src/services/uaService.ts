import apiClient from './api';
import type { UA } from '../types/ua';

export const uaService = {
  listar: async (): Promise<UA[]> => {
    const response = await apiClient.get('/uas/');
    return response.data;
  },
  buscarPorCodigo: async (codigo: string): Promise<UA> => {
    const response = await apiClient.get(`/uas/${codigo}`);
    return response.data;
  },
  criarEmLote: async (quantidade: number, filialId: number): Promise<UA[]> => {
    const response = await apiClient.post(`/uas/lote?quantidade=${quantidade}`, {
      filial_id: filialId
    });
    return response.data;
  }
};

