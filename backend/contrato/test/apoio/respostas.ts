import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = join(import.meta.dirname, '../../../../.md/mockup/respostas');

/** Lê os arquivos de `.md/mockup/respostas` cujo nome casa com `padrao`. */
export function respostas(padrao: RegExp): { nome: string; json: unknown }[] {
  return readdirSync(PASTA)
    .filter((nome) => padrao.test(nome))
    .map((nome) => ({
      nome,
      json: JSON.parse(readFileSync(join(PASTA, nome), 'utf8')) as unknown,
    }));
}
