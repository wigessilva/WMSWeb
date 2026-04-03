import type { Familia, FamiliaCriar } from '../types/familia';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const familiaService = {
  listar: async (termo?: string): Promise<Familia[]> => {
    const url = new URL(`${getBaseUrl()}/familias/`);
    if (termo) url.searchParams.append('busca', termo);

    const response = await fetch(url.toString(), { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar famílias');
    return response.json();
  },

  excluir: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/familias/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Erro ao excluir família');
  }
};