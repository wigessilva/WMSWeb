export const StatusRecebimento = {
  IMPORTADO: "IMPORTADO",
  PENDENTE: "PENDENTE",
  AGUARDANDO_LIBERACAO: "AGUARDANDO_LIBERACAO",
  AGUARDANDO_CONFERENCIA: "AGUARDANDO_CONFERENCIA",
  LIBERADO: "LIBERADO",
  EM_CONFERENCIA: "EM_CONFERENCIA",
  EM_ANALISE: "EM_ANALISE",
  FINALIZADO: "FINALIZADO",
  REJEITADO: "REJEITADO",
  DIVERGENTE: "DIVERGENTE",
} as const;

export type StatusRecebimento = typeof StatusRecebimento[keyof typeof StatusRecebimento];

export const StatusRecebimentoItem = {
  PENDENTE_VINCULO: "PENDENTE_VINCULO",
  AGUARDANDO_CONFERENCIA: "AGUARDANDO_CONFERENCIA",
  EM_CONFERENCIA: "EM_CONFERENCIA",
  CONFERIDO: "CONFERIDO",
  DIVERGENTE: "DIVERGENTE",
} as const;

export type StatusRecebimentoItem = typeof StatusRecebimentoItem[keyof typeof StatusRecebimentoItem];

export interface RecebimentoLeitura {
  ua: string;
  qtd: number;
  und: string;
  ean: string | null;
  lote: string | null;
  data_validade: string | null;
  fator_conversao: number;
  unidade_produto_id: number;
  descricao_visual: string | null;
  numero_sessao: number | null;
  int_embalagem: string | null;
  int_material: string | null;
  identificacao: string | null;
  cert_qual: string | null;
}

export interface RecebimentoItem {
  id: number;
  recebimento_id: number;
  sku: string | null;
  produto_id: number | null;
  codigo_fornecedor: string | null;
  descricao: string;
  qtd_nota: number;
  qtd_recebida: number | null;
  und: string;
  lote: string | null;
  data_fabricacao: string | null;
  data_validade: string | null;
  data_vencimento: string | null;
  int_embalagem: string | null;
  int_material: string | null;
  identificacao: string | null;
  cert_qual: string | null;
  destino: string | null;
  status: string;
  tentativas: number;
  descricoes_visuais?: string[];
  leituras?: RecebimentoLeitura[];
  
  // Parâmetros de conferência do produto (para validação)
  lote_obrigatorio?: boolean;
  bloquear_sem_lote?: boolean;
  bloquear_sem_validade?: boolean;
  vencimento_minimo?: number;
  fracionavel_recebimento?: boolean;
  is_bonificacao?: boolean;
}

export interface Recebimento {
  id: number;
  nfe: string;
  oc: string | null;
  fornecedor: string;
  conferente: string | null;
  autorizado_por?: string | null;
  autorizado_em?: string | null;
  inicio: string | null;
  inicio_conferencia: string | null;
  conclusao: string | null;
  status: string;
  divergencia_financeira?: string | null;
  dentro_da_tolerancia?: boolean;
  criado_em: string;
  itens: RecebimentoItem[];
}