import apiClient from './api';
import type { ParametrosMestres, ParametrosMestresEditar } from '../types/parametrosMestres';

export const parametrosMestresService = {
  obter: async (): Promise<ParametrosMestres> => {
    const response = await apiClient.get('/parametros-mestres/');
    const data = response.data;
    // Se o backend retornar uma lista, pega o primeiro. Se retornar o objeto direto, usa ele.
    return Array.isArray(data) ? data[0] : data;
  },

  atualizar: async (dados: ParametrosMestresEditar): Promise<ParametrosMestres> => {
    const response = await apiClient.put('/parametros-mestres/', dados);
    return response.data;
  }
};