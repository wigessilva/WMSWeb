const getBaseUrl = () => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8006';
  return `${urlServidorFilial}/api/v1/configuracao`;
};

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const configuracaoService = {
  getRoboConfig: async () => {
    const response = await fetch(`${getBaseUrl()}/robo-nfe`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Erro ao buscar configuração do robô");
    return response.json();
  },

  updateRoboConfig: async (caminho_diretorio: string) => {
    const response = await fetch(`${getBaseUrl()}/robo-nfe`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ caminho_diretorio })
    });
    if (!response.ok) throw new Error("Erro ao atualizar configuração do robô");
    return response.json();
  }
};