import type { UnidadeMedida } from '../types/unidadeMedida';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const unidadeMedidaService = {
  listar: async (): Promise<UnidadeMedida[]> => {
    const response = await fetch(`${getBaseUrl()}/unidades-medida/`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar unidades de medida');
    return response.json();
  },

  atualizarDecimais: async (id: number, decimais: boolean): Promise<UnidadeMedida> => {
    const response = await fetch(`${getBaseUrl()}/unidades-medida/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ decimais })
    });
    if (!response.ok) throw new Error('Erro ao atualizar configuração da unidade');
    return response.json();
  },

  sincronizarERP: async (): Promise<{ inseridas: number, atualizadas: number }> => {
    const response = await fetch(`${getBaseUrl()}/unidades-medida/sincronizar`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao sincronizar com o ERP');
    }
    return response.json();
  }
};