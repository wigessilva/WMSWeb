import axios from 'axios';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: getBaseUrl(),
});

// Interceptor para adicionar o token de sessão em cada requisição
apiClient.interceptors.request.use((config) => {
  const sessao = localStorage.getItem('wms_sessao_usuario');
  if (sessao) {
    const usuario = JSON.parse(sessao);
    if (usuario.token_sessao) {
      config.headers['X-Session-Token'] = usuario.token_sessao;
    }
  }
  
  // Atualiza a URL base caso tenha mudado no localStorage (troca de filial)
  config.baseURL = getBaseUrl();
  
  return config;
});

// Interceptor para tratar erros globais (como sessão expirada)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Se a sessão for inválida, limpa os dados e recarrega a página (o App.tsx enviará para o Login)
      localStorage.removeItem('wms_sessao_usuario');
      window.location.href = '/'; // Redireciona para a raiz que forçará o login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
