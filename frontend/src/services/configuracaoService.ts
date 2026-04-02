import axios from 'axios';

const api = axios.create();

// Redireciona a requisição inteira para o IP do servidor da filial selecionada
api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || 'http://localhost:8006';
  config.baseURL = `${urlServidorFilial}/api/v1/configuracao`;
  return config;
});

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