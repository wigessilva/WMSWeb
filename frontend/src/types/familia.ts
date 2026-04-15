export interface Familia {
  id: number;
  nome: string;
  descricao: string | null;
  variavel_consumo: string;
  tipo_validade: string | null;
  prazo_validade: number | null;
  vencimento_minimo: number | null;
  area_armazenagem_preferencial: string | null;
  lote_obrigatorio: boolean | null;
  modelo_giro: string | null;
  bloquear_vencido: boolean | null;
  bloquear_sem_validade: boolean | null;
  bloquear_sem_lote: boolean | null;
  bloquear_reprovado: boolean | null;
  fracionavel_recebimento: boolean | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FamiliaCriar {
  nome: string;
  descricao?: string;
  variavel_consumo: string;
  tipo_validade?: string;
  prazo_validade?: number;
  vencimento_minimo?: number;
  area_armazenagem_preferencial?: string;
  lote_obrigatorio?: boolean;
  modelo_giro?: string;
  bloquear_vencido?: boolean;
  bloquear_sem_validade?: boolean;
  bloquear_sem_lote?: boolean;
  bloquear_reprovado?: boolean;
  fracionavel_recebimento?: boolean;
}