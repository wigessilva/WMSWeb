import apiClient from './api';
import type { UnidadeMedida } from '../types/unidadeMedida';

export const unidadeMedidaService = {
  listar: async (): Promise<UnidadeMedida[]> => {
    const response = await apiClient.get('/unidades-medida/');
    return response.data;
  },

  atualizarDecimais: async (id: number, decimais: boolean): Promise<UnidadeMedida> => {
    const response = await apiClient.patch(`/unidades-medida/${id}`, { decimais });
    return response.data;
  },

  sincronizarERP: async (): Promise<{ inseridas: number, atualizadas: number }> => {
    const response = await apiClient.post('/unidades-medida/sincronizar');
    return response.data;
  }
};