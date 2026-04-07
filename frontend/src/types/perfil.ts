export interface Perfil {
  id: number;
  nome: string;
  descricao?: string;
  permite_liberar_sem_oc: boolean;
}

export interface PerfilCriar {
  nome: string;
  descricao?: string;
  permite_liberar_sem_oc: boolean;
}