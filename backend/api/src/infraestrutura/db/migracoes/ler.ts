import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PADRAO_NOME_MIGRACAO, type Migracao } from './aplicar.js';

/** Lê os `.sql` da pasta, em ordem de nome. Nome fora do padrão falha antes de aplicar qualquer coisa. */
export function lerMigracoes(pasta: string): Migracao[] {
  const nomes = readdirSync(pasta).filter((nome) => nome.endsWith('.sql'));
  const invalido = nomes.find((nome) => !PADRAO_NOME_MIGRACAO.test(nome));
  if (invalido) throw new Error(`Nome de migração inválido: ${invalido}`);
  return nomes.sort().map((nome) => ({ nome, sql: readFileSync(join(pasta, nome), 'utf8') }));
}
