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

  criarArea: async (dados: { letra: string; descricao: string; filial_id: number }): Promise<Area> => {
    const response = await apiClient.post('/areas/', dados);
    return response.data;
  },

  excluirArea: async (id: number): Promise<void> => {
    await apiClient.delete(`/areas/${id}`);
  },

  listarEstruturas: async (): Promise<EstruturaFisica[]> => {
    const response = await apiClient.get('/estruturas-fisicas/');
    return response.data;
  },

  criarEstrutura: async (dados: { nome: string; comporta_palete: boolean; comporta_caixa: boolean; comporta_log: boolean }): Promise<EstruturaFisica> => {
    const response = await apiClient.post('/estruturas-fisicas/', dados);
    return response.data;
  },

  excluirEstrutura: async (id: number): Promise<void> => {
    await apiClient.delete(`/estruturas-fisicas/${id}`);
  },

  listarFinalidades: async (): Promise<FinalidadeEndereco[]> => {
    const response = await apiClient.get('/finalidades-endereco/');
    return response.data;
  },

  criarFinalidade: async (dados: { nome: string; tipo_pulmao: boolean; tipo_picking: boolean; tipo_quarentena: boolean }): Promise<FinalidadeEndereco> => {
    const response = await apiClient.post('/finalidades-endereco/', dados);
    return response.data;
  },

  excluirFinalidade: async (id: number): Promise<void> => {
    await apiClient.delete(`/finalidades-endereco/${id}`);
  },

  listarProdutos: async (): Promise<ProdutoSimples[]> => {
    const response = await apiClient.get('/produtos/');
    return response.data;
  },
};
