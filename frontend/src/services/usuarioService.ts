import apiClient from './api';
import type { Usuario, UsuarioCriar } from '../types/usuario';

export const usuarioService = {
  listar: async (): Promise<Usuario[]> => {
    const response = await apiClient.get('/usuarios/');
    return response.data;
  },

  criar: async (usuario: UsuarioCriar): Promise<Usuario> => {
    const response = await apiClient.post('/usuarios/', usuario);
    return response.data;
  },

  atualizar: async (id: number, dados: any): Promise<Usuario> => {
    const response = await apiClient.put(`/usuarios/${id}`, dados);
    return response.data;
  },

  inativar: async (id: number): Promise<Usuario> => {
    const response = await apiClient.put(`/usuarios/${id}/inativar`);
    return response.data;
  }
};
