import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ_API = fileURLToPath(new URL('../../', import.meta.url));
const RAIZ_BACKEND = join(RAIZ_API, '..');
const REPOSITORIO = 'api/src/infraestrutura/db/repositorios/jogadores.ts';
const TIPOS = 'api/src/infraestrutura/db/tipos/elenco.ts';
const PASTA_MIGRACOES = 'api/src/infraestrutura/db/migracoes/';

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    if (nome === 'node_modules' || nome === 'test' || nome === 'dist') return [];
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const doBackend = (caminho: string) => relative(RAIZ_BACKEND, caminho).replaceAll('\\', '/');

/** Cada função de nível superior do repositório com o seu corpo; o que vem antes da 1ª é o "cabeçalho". */
function funcoesDoRepositorio(texto: string): Map<string, string> {
  const partes = texto.split(/^(?=(?:export )?(?:async )?function \w+)/m);
  const mapa = new Map<string, string>();
  partes.forEach((parte, i) => {
    const nome = i === 0 ? 'cabecalho' : (/function (\w+)/.exec(parte)?.[1] ?? `parte${i}`);
    mapa.set(nome, parte);
  });
  return mapa;
}

describe('quem escreve em inicio_pontuacao (acumulado pela função única)', () => {
  const codigo = ['api/src', 'scripts'].flatMap((p) => arquivos(join(RAIZ_BACKEND, p)));

  it('só o repositório de jogadores, os tipos e as migrações citam a coluna', () => {
    const citam = codigo
      .filter((f) => /\.(ts|mjs|js|sql)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes('inicio_pontuacao'))
      .map(doBackend)
      .filter((f) => !f.startsWith(PASTA_MIGRACOES));
    expect(citam.sort()).toEqual([REPOSITORIO, TIPOS].sort());
  });

  it('no repositório, só criar e alterarInicio escrevem a coluna', () => {
    const funcoes = funcoesDoRepositorio(readFileSync(join(RAIZ_BACKEND, REPOSITORIO), 'utf8'));
    const comColuna = [...funcoes].filter(([, corpo]) => corpo.includes('inicio_pontuacao')).map(([nome]) => nome);
    expect(comColuna.sort()).toEqual(['alterarInicio', 'cabecalho', 'consultar', 'criar']);
    const escreve = (corpo: string) => /\b(insertInto|updateTable|INSERT|UPDATE)\b/.test(corpo);
    expect(escreve(funcoes.get('cabecalho') ?? '')).toBe(false);
    expect(escreve(funcoes.get('consultar') ?? '')).toBe(false);
    expect(escreve(funcoes.get('criar') ?? '')).toBe(true);
    expect(escreve(funcoes.get('alterarInicio') ?? '')).toBe(true);
  });
});
