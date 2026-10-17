import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JsonBodyType } from 'msw';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');

/** Id de jogador do mockup (`j-alemao`) no formato uuid que o contrato exige no corpo dos envios. */
export function uuidDoJogador(id: string): string {
  const hex = Buffer.from(id).toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Resposta do mockup, com os ids de jogador (`j-…`) trocados por uuids determinísticos. */
export function lerFixture(nome: string): JsonBodyType {
  const texto = readFileSync(join(RESPOSTAS, nome), 'utf8').replace(
    /"(j-[a-z0-9-]+)"/g,
    (_t, id: string) => `"${uuidDoJogador(id)}"`,
  );
  return JSON.parse(texto) as JsonBodyType;
}
