export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil_id: number;
  ativo: boolean;
  ultimo_login?: string;
}

export interface UsuarioCriar {
  nome: string;
  login: string;
  senha?: string; // A senha só vai na criação
  perfil_id: number;
  ativo: boolean;
}