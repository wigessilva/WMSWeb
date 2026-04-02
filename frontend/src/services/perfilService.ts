import type { Perfil, PerfilCriar } from '../types/perfil';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || 'http://localhost:8006';

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const perfilService = {
  listar: async (): Promise<Perfil[]> => {
    const response = await fetch(`${getBaseUrl()}/perfis/`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar perfis');
    return response.json();
  },

  criar: async (perfil: PerfilCriar): Promise<Perfil> => {
    const response = await fetch(`${getBaseUrl()}/perfis/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(perfil),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao criar perfil');
    }
    return response.json();
  },

  excluir: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/perfis/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao excluir perfil');
    }
  }
};