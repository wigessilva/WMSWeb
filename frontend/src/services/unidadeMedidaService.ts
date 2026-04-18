import apiClient from './api';
import type { UnidadeMedida } from '../types/unidadeMedida';

export const unidadeMedidaService = {
  listar: async (natureza?: string): Promise<UnidadeMedida[]> => {
    const url = natureza ? `/unidades-medida/?natureza=${natureza}` : '/unidades-medida/';
    const response = await apiClient.get(url);
    return response.data;
  },

  atualizar: async (id: number, dados: { decimais?: boolean, natureza?: string, fator_conversao?: number, usuario?: string }): Promise<UnidadeMedida> => {
    const response = await apiClient.patch(`/unidades-medida/${id}`, dados);
    return response.data;
  },

  sincronizarERP: async (usuario?: string): Promise<{ inseridas: number, atualizadas: number }> => {
    const response = await apiClient.post(`/unidades-medida/sincronizar${usuario ? `?usuario=${usuario}` : ''}`);
    return response.data;
  }
};