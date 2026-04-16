import apiClient from './api';
import type { Usuario } from '../types/usuario';

export const authService = {
  login: async (loginStr: string, senhaStr: string): Promise<Usuario> => {
    const response = await apiClient.post('/auth/login', { login: loginStr, senha: senhaStr });
    return response.data;
  }
};