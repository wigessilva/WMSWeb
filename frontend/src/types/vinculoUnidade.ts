export interface VinculoUnidade {
  id: number;
  unidade_externa: string;
  unidade_medida_id: number;
  criado_em?: string;
  atualizado_em?: string;
}

export interface VinculoUnidadeCriar {
  unidade_externa: string;
  unidade_medida_id: number;
}