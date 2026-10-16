import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { REGISTRO } from '../src/registro.js';
import { acharEDono, compararEsquema, lerQuebrasAceitas, type Direcao, type Quebra } from './comparar.js';

export const PASTA_SNAPSHOT = join(import.meta.dirname, '../snapshot');
export const ARQUIVO_QUEBRAS = join(import.meta.dirname, '../QUEBRAS.md');

export interface Instantaneo {
  direcao: Direcao;
  esquema: unknown;
}

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (typeof valor === 'object' && valor !== null) {
    return Object.fromEntries(
      Object.entries(valor)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([chave, filho]) => [chave, ordenar(filho)]),
    );
  }
  return valor;
}

/** Gera o JSON Schema de cada esquema registrado, com chaves ordenadas. */
export function gerarInstantaneos(): Record<string, Instantaneo> {
  const saida: Record<string, Instantaneo> = {};
  for (const [nome, { direcao, schema }] of Object.entries(REGISTRO)) {
    const esquema = z.toJSONSchema(schema, {
      io: direcao === 'entrada' ? 'input' : 'output',
      unrepresentable: 'any',
    });
    delete (esquema as Record<string, unknown>)['$schema'];
    saida[nome] = { direcao, esquema: ordenar(esquema) };
  }
  return saida;
}

export const serializar = (instantaneo: Instantaneo): string => `${JSON.stringify(instantaneo, null, 2)}\n`;

/** Lê o snapshot versionado. Pasta ausente, vazia ou arquivo corrompido lança (falha fechado). */
export function lerSnapshot(pasta = PASTA_SNAPSHOT): Record<string, Instantaneo> {
  if (!existsSync(pasta)) throw new Error('Snapshot ausente: rode "pnpm --filter @pelada/contrato snapshot".');
  const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith('.json'));
  if (arquivos.length === 0) throw new Error('Snapshot vazio: rode "pnpm --filter @pelada/contrato snapshot".');
  const saida: Record<string, Instantaneo> = {};
  for (const arquivo of arquivos) {
    const bruto = JSON.parse(readFileSync(join(pasta, arquivo), 'utf8')) as Partial<Instantaneo>;
    if ((bruto.direcao !== 'entrada' && bruto.direcao !== 'resposta') || bruto.esquema === undefined) {
      throw new Error(`Snapshot corrompido: ${arquivo}`);
    }
    saida[arquivo.replace(/\.json$/, '')] = { direcao: bruto.direcao, esquema: bruto.esquema };
  }
  return saida;
}

export interface Relatorio {
  quebras: Quebra[];
  eDono: string[];
  desatualizados: string[];
}

/** Compara o código atual com o snapshot. */
export function conferir(
  atual: Record<string, Instantaneo>,
  antigo: Record<string, Instantaneo>,
  quebrasMd: string,
): Relatorio {
  const aceitas = lerQuebrasAceitas(quebrasMd);
  const quebras: Quebra[] = [];
  const eDono: string[] = [];
  const desatualizados: string[] = [];

  for (const [nome, anterior] of Object.entries(antigo)) {
    const corrente = atual[nome];
    if (!corrente) {
      if (!aceitas.some((a) => a.esquema === nome && a.caminho === '')) {
        quebras.push({ esquema: nome, caminho: '', mudanca: 'esquema removido' });
      }
      continue;
    }
    quebras.push(...compararEsquema(nome, anterior.direcao, anterior.esquema, corrente.esquema, aceitas));
  }
  for (const [nome, corrente] of Object.entries(atual)) {
    if (corrente.direcao === 'entrada') {
      eDono.push(...acharEDono(corrente.esquema).map((caminho) => `${nome}.${caminho}`));
    }
    const anterior = antigo[nome];
    if (!anterior || serializar(anterior) !== serializar(corrente)) desatualizados.push(nome);
  }
  return { quebras, eDono, desatualizados };
}

export function gravar(atual: Record<string, Instantaneo>, pasta = PASTA_SNAPSHOT): void {
  mkdirSync(pasta, { recursive: true });
  for (const arquivo of readdirSync(pasta).filter((n) => n.endsWith('.json'))) {
    if (!(arquivo.replace(/\.json$/, '') in atual)) rmSync(join(pasta, arquivo));
  }
  for (const [nome, instantaneo] of Object.entries(atual)) {
    writeFileSync(join(pasta, `${nome}.json`), serializar(instantaneo));
  }
}

/** Há ao menos um arquivo de snapshot versionado? */
export function temSnapshot(pasta = PASTA_SNAPSHOT): boolean {
  return existsSync(pasta) && readdirSync(pasta).some((nome) => nome.endsWith('.json'));
}
