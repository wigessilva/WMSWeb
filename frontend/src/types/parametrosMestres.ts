export interface ParametrosMestres {
  id: number;
  validade_obrigatoria: boolean;
  lote_obrigatorio: boolean;
  modelo_giro: string;
  bloquear_vencido: boolean;
  bloquear_reprovado: boolean;
  bloquear_sem_validade: boolean;
  bloquear_sem_lote: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ParametrosMestresEditar {
  validade_obrigatoria?: boolean;
  lote_obrigatorio?: boolean;
  modelo_giro?: string;
  bloquear_vencido?: boolean;
  bloquear_reprovado?: boolean;
  bloquear_sem_validade?: boolean;
  bloquear_sem_lote?: boolean;
}