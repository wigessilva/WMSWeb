import type { Produto } from '../types/produto';

const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const produtoService = {
  listar: async (termo?: string): Promise<Produto[]> => {
    const url = new URL(`${getBaseUrl()}/produtos/`);
    if (termo) url.searchParams.append('busca', termo);

    const response = await fetch(url.toString(), { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar produtos');
    return response.json();
  },

  sincronizar: async (): Promise<{ inseridos: number, atualizados: number }> => {
    const response = await fetch(`${getBaseUrl()}/produtos/sincronizar-erp`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao sincronizar produtos');
    return response.json();
  },

  editar: async (id: number, produto: Partial<Produto>): Promise<Produto> => {
    const response = await fetch(`${getBaseUrl()}/produtos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(produto)
    });
    if (!response.ok) throw new Error('Erro ao atualizar produto');
    return response.json();
  },

  editarUnidade: async (unidadeId: number, dados: any) => {
    const response = await fetch(`${getBaseUrl()}/produtos/unidade/${unidadeId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(dados)
    });
    if (!response.ok) throw new Error('Erro ao atualizar a unidade');
    return response.json();
  },
  
  listarUnidades: async (produtoId: number) => {
    const response = await fetch(`${getBaseUrl()}/produtos/${produtoId}/unidades`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Erro ao buscar unidades do produto');
    return response.json();
  }
};