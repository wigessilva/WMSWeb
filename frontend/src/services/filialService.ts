import type { Filial, FilialCriar } from '../types/filial';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const filialService = {
  listar: async (): Promise<Filial[]> => {
    const response = await fetch(`${getBaseUrl()}/filiais/`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar filiais');
    return response.json();
  },

  criar: async (filial: FilialCriar): Promise<Filial> => {
    const response = await fetch(`${getBaseUrl()}/filiais/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(filial),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao criar filial');
    }
    return response.json();
  },

  atualizar: async (id: number, filial: Partial<FilialCriar>): Promise<Filial> => {
    const response = await fetch(`${getBaseUrl()}/filiais/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(filial),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao atualizar filial');
    }
    return response.json();
  },

  excluir: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/filiais/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao excluir filial');
    }
  }
};