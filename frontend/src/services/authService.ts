import type { Usuario } from '../types/usuario';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

export const authService = {
  login: async (loginStr: string, senhaStr: string): Promise<Usuario> => {
    const response = await fetch(`${getBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginStr, senha: senhaStr }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro ao iniciar sessão');
    }

    return response.json();
  }
};