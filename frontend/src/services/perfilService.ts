import apiClient from './api';
import type { Perfil, PerfilCriar } from '../types/perfil';

export const perfilService = {
  listar: async (): Promise<Perfil[]> => {
    const response = await apiClient.get('/perfis/');
    return response.data;
  },

  criar: async (perfil: PerfilCriar): Promise<Perfil> => {
    const response = await apiClient.post('/perfis/', perfil);
    return response.data;
  },

  atualizar: async (id: number, perfil: PerfilCriar): Promise<Perfil> => {
    const response = await apiClient.put(`/perfis/${id}`, perfil);
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await apiClient.delete(`/perfis/${id}`);
  }
};