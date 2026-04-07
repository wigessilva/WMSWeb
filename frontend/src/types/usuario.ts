export interface FilialResumo {
  id: number;
  nome: string;
  url_api?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil_id: number;
  ativo: boolean;
  ultimo_login?: string;
  filiais?: FilialResumo[];
  permissoes?: string[];  // Chaves das permissões do perfil
}

export interface UsuarioCriar {
  nome: string;
  login: string;
  senha?: string;
  perfil_id: number;
  ativo: boolean;
  filiais_ids?: number[];
}