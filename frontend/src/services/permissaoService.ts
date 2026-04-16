import apiClient from './api';

export interface PermissaoInfo {
  id: number;
  chave: string;
  descricao: string;
}

// Mapeamento de nomes amigáveis para os módulos
export const MODULO_LABELS: Record<string, string> = {
  'RECEBIMENTO': '📦 Recebimento',
  'ESTOQUE': '📦 Estoque',
  'CADASTROS': '📦 Cadastros',
  'CONFIGURACOES': '⚙️ Configurações',
  'ACESSOS': '🔒 Gestão de Acessos',
};

// Mapeamento de módulos → prefixos de permissão para o sidebar
export const SIDEBAR_MODULOS: Record<string, string[]> = {
  'CONFIGURACOES': ['CONFIGURACOES.', 'ACESSOS.'],
  'CADASTROS': ['CADASTROS.'],
  'ESTOQUE': ['ESTOQUE.'],
  'RECEBIMENTO': ['RECEBIMENTO.'],
};

export const permissaoService = {
  listarAgrupadas: async (): Promise<Record<string, PermissaoInfo[]>> => {
    const response = await apiClient.get('/permissoes/');
    return response.data;
  },
};

