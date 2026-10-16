const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export interface ComApelido {
  id: string;
  apelido: string;
}

/** Ordem alfabética sem acento nem caixa; o `id` desempata para a ordem ser sempre a mesma. */
export function compararApelido(a: ComApelido, b: ComApelido): number {
  return collator.compare(a.apelido, b.apelido) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
