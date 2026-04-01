export interface Perfil {
  id: number;
  nome: string;
  descricao?: string;
}

export interface PerfilCriar {
  nome: string;
  descricao?: string;
}