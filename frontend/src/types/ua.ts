export interface UA {
  id: number;
  ua: string;
  sku?: string | null;
  descricao?: string | null;
  filial_id: number;
  filial_destino_id?: number | null;
  produto_id?: number | null;
  lote?: string | null;
  data_validade?: string | null;
  quantidade?: number | null;
  unidade_produto_id?: number | null;
  fator_conversao?: number | null;
  unidade_medida_id?: number | null;
  endereco_id?: number | null;
  largura?: number | null;
  comprimento?: number | null;
  altura?: number | null;
  estado: string;
  status: string;
  observacoes?: string | null;
  ean?: string | null;
  descricao_visual?: string | null;
  sem_gtin?: boolean; // Campo auxiliar para UI de conferência
  und?: string | null; // Campo auxiliar para UI de conferência
  criado_em: string;
  atualizado_em: string;
}
