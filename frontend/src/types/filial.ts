export interface Filial {
  id: number;
  nome: string;
  cnpj?: string | null;
  url_api?: string | null;
  is_matriz: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  rowversion: number;
}

export interface FilialCriar {
  nome: string;
  cnpj?: string | null;
  url_api?: string | null;
  is_matriz: boolean;
  ativo: boolean;
}