import apiClient from './api';
import type { Endereco, EnderecoLoteCriar, EnderecoAtualizar, Area, EstruturaFisica, FinalidadeEndereco, ProdutoSimples } from '../types/endereco';

export const enderecoService = {
  listar: async (): Promise<Endereco[]> => {
    const response = await apiClient.get('/enderecos/');
    return response.data;
  },

  gerarLote: async (dados: EnderecoLoteCriar): Promise<{ mensagem: string }> => {
    const response = await apiClient.post('/enderecos/gerar-lote', dados);
    return response.data;
  },

  atualizar: async (id: number, dados: EnderecoAtualizar): Promise<Endereco> => {
    const response = await apiClient.put(`/enderecos/${id}`, dados);
    return response.data;
  },

  excluir: async (id: number): Promise<void> => {
    await apiClient.delete(`/enderecos/${id}`);
  },

  // --- Tabelas de Apoio ---

  listarAreas: async (): Promise<Area[]> => {
    const response = await apiClient.get('/areas/');
    return response.data;
  },

  listarEstruturas: async (): Promise<EstruturaFisica[]> => {
    const response = await apiClient.get('/estruturas-fisicas/');
    return response.data;
  },

  listarFinalidades: async (): Promise<FinalidadeEndereco[]> => {
    const response = await apiClient.get('/finalidades-endereco/');
    return response.data;
  },

  listarProdutos: async (): Promise<ProdutoSimples[]> => {
    const response = await apiClient.get('/produtos/');
    return response.data;
  },
};
