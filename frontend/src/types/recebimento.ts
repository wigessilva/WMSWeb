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

export interface RecebimentoItem {
  id: number;
  recebimento_id: number;
  sku: string | null;
  codigo_fornecedor: string | null;
  descricao: string;
  qtd_nota: number;
  qtd_recebida: number | null;
  und: string;
  lote: string | null;
  data_fabricacao: string | null;
  data_validade: string | null;
  data_vencimento: string | null;
  integridade_embalagem: boolean | null;
  integridade_material: boolean | null;
  identificacao: boolean | null;
  certificado_qualidade: boolean | null;
  destino: string | null;
  status: string;
}

export interface Recebimento {
  id: number;
  nfe: string;
  oc: string | null;
  fornecedor: string;
  conferente_id: number | null;
  autorizado_por?: string | null;
  autorizado_em?: string | null;
  data_inicio: string | null;
  conclusao: string | null;
  status: string;
  criado_em: string;
  itens: RecebimentoItem[];
}