import type { Usuario, UsuarioCriar } from '../types/usuario';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || 'http://localhost:8006';

export const usuarioService = {
  listar: async (): Promise<Usuario[]> => {
    const response = await fetch(`${getBaseUrl()}/usuarios/`);
    if (!response.ok) throw new Error('Erro ao buscar usuários');
    return response.json();
  },

  criar: async (usuario: UsuarioCriar): Promise<Usuario> => {
    const response = await fetch(`${getBaseUrl()}/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao inativar usuário');
    }
    return response.json();
  }
};