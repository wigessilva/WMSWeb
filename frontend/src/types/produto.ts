export interface UnidadeProduto {
  id: number;
  tipo: string;
  unidade_medida_id: number;
  fator_conversao: number;
  peso_bruto: number | null;
  largura: number | null;
  largura_unidade_id: number | null;
  comprimento: number | null;
  comprimento_unidade_id: number | null;
  altura: number | null;
  altura_unidade_id: number | null;
  ean: string | null;
  unidade_medida_relacao?: {
    sigla: string;
  };
  largura_unidade_rel?: {
    sigla: string;
  };
  comprimento_unidade_rel?: {
    sigla: string;
  };
  altura_unidade_rel?: {
    sigla: string;
  };
}

export interface Produto {
  id: number;
  sku: string;
  descricao: string;
  referencia: string | null;
  familia_id: number | null;
  status: string;
  bloqueado: boolean;
  motivo_bloqueio: string | null;
  codigo_fornecedor?: string | null;
  variavel_consumo: string | null;
  tipo_validade?: string | null;
  prazo_validade?: number | null;
  vencimento_minimo?: number | null;
  area_armazenagem_preferencial?: string | null;
  lote_obrigatorio?: boolean | null;
  modelo_giro?: string | null;
  bloquear_vencido?: boolean | null;
  bloquear_sem_validade?: boolean | null;
  bloquear_sem_lote?: boolean | null;
  bloquear_reprovado?: boolean | null;
  fracionavel_recebimento?: boolean | null;
  unidade_medida_id: number | null;
  criado_em: string;
  atualizado_em: string;
  unidades?: UnidadeProduto[];
}