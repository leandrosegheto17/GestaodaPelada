interface ErroPg {
  code?: string;
  constraint?: string;
}

/** Relança `criarErro()` quando o erro é violação de unicidade (23505) do índice `indice`; senão relança o original. */
export function seViolarUnico(erro: unknown, indice: string, criarErro: () => Error): never {
  const pg = erro as ErroPg;
  if (pg.code === '23505' && pg.constraint === indice) throw criarErro();
  throw erro;
}
