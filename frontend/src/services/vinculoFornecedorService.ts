import axios from 'axios';

const api = axios.create();

api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;
  config.baseURL = `${urlServidorFilial}/vinculos-fornecedores`;
  return config;
});

export type VinculoFornecedor = {
  id: number;
  sku: string;
  descricao: string;
  codigoFornecedor: string;
  cnpjFornecedor: string;
  criadoPor?: string;
};

export const vinculoFornecedorService = {
  listar: async (termo?: string): Promise<VinculoFornecedor[]> => {
    const params = termo ? { termo } : {};
    const response = await api.get('/', { params });
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/${id}`);
  }
};
