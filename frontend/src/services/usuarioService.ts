import type { Usuario, UsuarioCriar } from '../types/usuario';

// Busca diretamente a URL do servidor físico salvo
const getBaseUrl = () => localStorage.getItem('wms_api_url') || 'http://localhost:8006';

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const usuarioService = {
  listar: async (): Promise<Usuario[]> => {
    const response = await fetch(`${getBaseUrl()}/usuarios/`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar usuários');
    return response.json();
  },

  criar: async (usuario: UsuarioCriar): Promise<Usuario> => {
    const response = await fetch(`${getBaseUrl()}/usuarios/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(usuario),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao criar usuário');
    }
    return response.json();
  },

  inativar: async (id: number): Promise<Usuario> => {
    const response = await fetch(`${getBaseUrl()}/usuarios/${id}/inativar`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao inativar usuário');
    }
    return response.json();
  }
};