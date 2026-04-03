import type { ParametrosMestres, ParametrosMestresEditar } from '../types/parametrosMestres';

// Pega a URL do localStorage ou usa a variável de ambiente/padrão
const getBaseUrl = () => localStorage.getItem('wms_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8006';

const getHeaders = () => ({
  'Content-Type': 'application/json'
});

export const parametrosMestresService = {
  obter: async (): Promise<ParametrosMestres> => {
    const response = await fetch(`${getBaseUrl()}/parametros-mestres/`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Erro ao buscar parâmetros mestres");
    const data = await response.json();
    // Se o backend retornar uma lista, pega o primeiro. Se retornar o objeto direto, usa ele.
    return Array.isArray(data) ? data[0] : data;
  },

  atualizar: async (id: number, dados: ParametrosMestresEditar): Promise<ParametrosMestres> => {
    const response = await fetch(`${getBaseUrl()}/parametros-mestres/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(dados)
    });
    if (!response.ok) throw new Error("Erro ao atualizar parâmetros mestres");
    return response.json();
  }
};