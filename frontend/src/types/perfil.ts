export interface Permissao {
  id: number;
  chave: string;
  descricao?: string;
}

export interface Perfil {
  id: number;
  nome: string;
  descricao?: string;
  permissoes: Permissao[];
}

export interface PerfilCriar {
  nome: string;
  descricao?: string;
  permissoes: string[]; // Lista de chaves (strings)
}