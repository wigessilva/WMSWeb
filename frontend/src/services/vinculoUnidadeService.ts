import type { VinculoUnidade, VinculoUnidadeCriar } from '../types/vinculoUnidade';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const vinculoUnidadeService = {
  listar: async (): Promise<VinculoUnidade[]> => {
    const response = await fetch(`${getBaseUrl()}/vinculos-unidade/`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar vínculos de unidades');
    return response.json();
  },

  criar: async (dados: VinculoUnidadeCriar): Promise<VinculoUnidade> => {
    const response = await fetch(`${getBaseUrl()}/vinculos-unidade/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(dados),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao criar vínculo');
    }
    return response.json();
  },

  atualizar: async (id: number, dados: VinculoUnidadeCriar): Promise<VinculoUnidade> => {
    const response = await fetch(`${getBaseUrl()}/vinculos-unidade/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(dados),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao atualizar vínculo');
    }
    return response.json();
  },

  excluir: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/vinculos-unidade/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao excluir vínculo');
    }
  }
};