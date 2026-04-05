import axios from 'axios';

const api = axios.create();

// Redireciona a requisição inteira para o IP do servidor da filial selecionada
api.interceptors.request.use((config) => {
  const urlServidorFilial = localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;
  config.baseURL = `${urlServidorFilial}/vinculos-fornecedor`;
  return config;
});

export const vinculoFornecedorService = {
  sugerir: async (dados: {
    cnpj_fornecedor: string;
    codigo_fornecedor: string;
    unidade_nota: string;
    quantidade_nota: number;
    preco_unitario_nota: number;
    xped?: string;
  }) => {
    const response = await api.post('/sugerir', dados);
    return response.data;
  },

  salvar: async (dados: {
    produto_id: number;
    codigo_fornecedor: string;
    cnpj_fornecedor: string;
  }) => {
    const response = await api.post('/salvar', dados);
    return response.data;
  }
}