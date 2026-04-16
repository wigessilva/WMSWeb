/**
 * Hook reutilizável para verificar permissões do usuário logado.
 * Lê diretamente do sessionStorage, sem depender de props do App.tsx.
 */
export function usePermissao() {
  const sessao = localStorage.getItem('wms_sessao_usuario');
  const usuario = sessao ? JSON.parse(sessao) : {};
  const permissoes: string[] = usuario.permissoes || [];

  /**
   * Verifica se o usuário possui ao menos uma permissão que comece com os prefixos indicados.
   * Exemplo: temPermissao('RECEBIMENTO.VINCULAR_SKU') → true se o usuário tem essa chave.
   * Exemplo: temPermissao('CADASTROS.') → true se o usuário tem qualquer permissão de cadastros.
   */
  const temPermissao = (...chaves: string[]) =>
    chaves.some(chave => permissoes.some(p => p.startsWith(chave)));

  return { temPermissao };
}
