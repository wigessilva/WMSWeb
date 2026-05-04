// --- Endereço ---

export interface Endereco {
  id: number;
  area_id: number;
  rua: number;
  predio: number;
  nivel: number;
  posicao: number;
  codigo_formatado: string;
  estrutura_fisica_id: number;
  finalidade_id: number;
  peso_maximo_kg: number;
  produto_id: number | null;
  capacidade_maxima_und: number | null;
  ativo: boolean;
  bloqueado: boolean;
  motivo_bloqueio: string | null;
  criado_em: string;
  atualizado_em: string;
  rowversion: number;

  // Campos expandidos
  area_letra: string | null;
  estrutura_nome: string | null;
  finalidade_nome: string | null;
  produto_descricao: string | null;
}

export interface EnderecoLoteCriar {
  area_id: number;
  rua_inicio: number;
  rua_fim: number;
  predio_inicio: number;
  predio_fim: number;
  nivel_inicio: number;
  nivel_fim: number;
  posicao_inicio: number;
  posicao_fim: number;
  estrutura_fisica_id: number;
  finalidade_id: number;
  peso_maximo_kg: number;
  produto_id?: number | null;
  capacidade_maxima_und?: number | null;
  ativo?: boolean;
  bloqueado?: boolean;
  motivo_bloqueio?: string | null;
}

export interface EnderecoAtualizar {
  estrutura_fisica_id?: number;
  finalidade_id?: number;
  peso_maximo_kg?: number;
  produto_id?: number | null;
  capacidade_maxima_und?: number | null;
  ativo?: boolean;
  bloqueado?: boolean;
  motivo_bloqueio?: string | null;
  rowversion: number;
}

// --- Tabelas de Apoio ---

export interface Area {
  id: number;
  letra: string;
  descricao: string;
  filial_id: number;
}

export interface EstruturaFisica {
  id: number;
  nome: string;
  comporta_palete: boolean;
  comporta_caixa: boolean;
  comporta_log: boolean;
}

export interface FinalidadeEndereco {
  id: number;
  nome: string;
  tipo_pulmao: boolean;
  tipo_picking: boolean;
  tipo_quarentena: boolean;
}

// --- Produto (simplificado para selecionar no endereço) ---

export interface ProdutoSimples {
  id: number;
  sku: string;
  descricao: string;
}
