import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8006/api/v1/configuracao' });

export const configuracaoService = {
  getRoboConfig: async () => {
    const response = await api.get('/robo-nfe');
    return response.data;
  },
  updateRoboConfig: async (caminho_diretorio: string) => {
    const response = await api.put('/robo-nfe', { caminho_diretorio });
    return response.data;
  }
};