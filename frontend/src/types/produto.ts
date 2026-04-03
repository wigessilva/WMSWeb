export interface Produto {
  id: number;
  sku: string;
  descricao: string;
  referencia: string | null;
  familia_id: number | null;
  herdar_regras_familia: boolean;
  variavel_consumo: string | null;
  unidade_medida_id: number | null;
  status: string;
  largura_mm: number | null;
  comprimento_m: number | null;
  bloqueado: boolean;
  motivo_bloqueio: string | null;
  criado_em: string;
  atualizado_em: string;
}