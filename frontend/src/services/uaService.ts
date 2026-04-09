import axios from 'axios';
import type { UA } from '../types/ua';

const api = axios.create();

// Interceptor para injetar a URL base dinamicamente (seguindo o padrão das outras rotas)
api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  config.baseURL = `${urlServidorFilial}/uas`;
  return config;
});

export const uaService = {
  listar: async (): Promise<UA[]> => {
    const response = await api.get('/');
    return response.data;
  }
};
