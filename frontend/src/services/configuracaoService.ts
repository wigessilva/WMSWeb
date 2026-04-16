import apiClient from './api';

export const configuracaoService = {
  getRoboConfig: async () => {
    const response = await apiClient.get('/configuracao/robo-nfe');
    return response.data;
  },

  updateRoboConfig: async (caminho_diretorio: string) => {
    const response = await apiClient.put('/configuracao/robo-nfe', { caminho_diretorio });
    return response.data;
  }
};