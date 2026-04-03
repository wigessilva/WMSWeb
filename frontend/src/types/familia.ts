export interface Familia {
  id: number;
  nome: string;
  descricao: string | null;
  variavel_consumo: string;
  herdar_parametros_mestres: boolean;
  validade_obrigatoria: boolean | null;
  lote_obrigatorio: boolean | null;
  modelo_giro: string | null;
  bloquear_vencido: boolean | null;
  bloquear_reprovado: boolean | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FamiliaCriar {
  nome: string;
  descricao?: string;
  tipo_validade?: string;
  prazo_validade?: number;
  vencimento_minimo?: number;
  variavel_consumo?: string;
  area_armazenagem_preferencial?: string;
  controle_lote?: string;
  giro_estoque?: string;
  bloquear_vencido?: boolean;
  bloquear_sem_validade?: boolean;
  bloquear_sem_lote?: boolean;
  bloquear_reprovado?: boolean;
}