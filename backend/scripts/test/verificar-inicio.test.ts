import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emLeitura } from '../../api/src/infraestrutura/db/index.ts';
import * as jogadores from '../../api/src/infraestrutura/db/repositorios/jogadores.ts';
import { verificarInicio } from '../verificar-inicio/verificar.ts';
import { criarBancoDescartavel, type BancoDescartavel } from './importar-legado/banco.ts';

const RAIZ = resolve(import.meta.dirname, '../../..');
const SCRIPTS = join(RAIZ, 'backend/scripts');
const HOJE = '2026-10-21';
const TELEFONE = '11987654321';

let banco: BancoDescartavel;

async function inserirJogador(apelido: string, inicial: number, inicioPeriodo: string, presencas: string[]) {
  const id = (
    await banco.consultar<{ id: string }>(
      `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, telefone, pontuacao_inicial, criado_por, criado_em, alterado_por, alterado_em)
       VALUES ($1, $2, 1990, 'meia', $3, $4, $5, now(), $5, now()) RETURNING id`,
      [banco.grupoId, apelido, TELEFONE, inicial, banco.contaId],
    )
  )[0]!.id;
  await banco.consultar(`INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio) VALUES ($1, $2, $3)`, [
    id,
    banco.grupoId,
    inicioPeriodo,
  ]);
  for (const data of presencas) {
    await banco.consultar(
      `INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao)
       SELECT id, $1, grupo_id, 'presente' FROM partidas WHERE grupo_id = $2 AND data = $3`,
      [id, banco.grupoId, data],
    );
  }
  return id;
}

async function executarVerificacao() {
  const linhas: string[] = [];
  const resultado = await verificarInicio({ db: banco.db, hoje: HOJE, escrever: (l) => linhas.push(l) });
  return { ...resultado, linhas };
}

function cli(url: string | undefined) {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: 'true' };
  delete env['DATABASE_URL'];
  if (url) env['DATABASE_URL'] = url;
  return spawnSync(process.execPath, ['--import', 'tsx', join(SCRIPTS, 'verificar-inicio.ts')], {
    encoding: 'utf8',
    env,
    cwd: RAIZ,
  });
}

beforeAll(async () => {
  banco = await criarBancoDescartavel();
  for (const data of ['2026-09-20', '2026-09-27', '2026-10-11']) {
    await banco.consultar(
      `INSERT INTO partidas (grupo_id, data, criada_por, criada_em, alterada_por, alterada_em) VALUES ($1, $2, $3, now(), $3, now())`,
      [banco.grupoId, data, banco.contaId],
    );
  }
}, 60_000);

afterAll(async () => {
  await banco.derrubar();
});

describe('verificar-inicio', () => {
  it('sem diferença quando a data de início preenchida mantém o acumulado de todos', async () => {
    await inserirJogador('Sem Presenca', 7, '2026-09-01', []);
    const vandre = await inserirJogador('Vandre Fictício', 3, '2026-09-20', ['2026-09-20', '2026-09-27', '2026-10-11']);
    await banco.consultar('UPDATE jogadores SET inicio_pontuacao = $1 WHERE id = $2', ['2026-09-20', vandre]);

    const r = await executarVerificacao();
    expect(r).toMatchObject({ diferencas: 0, jogadores: 2 });
    expect(cli(banco.url).status).toBe(0);
  });

  it('o log traz só ids e números, nunca apelido nem telefone', async () => {
    const { linhas } = await executarVerificacao();
    const texto = linhas.join('\n');
    expect(texto).toMatch(/jogador=[0-9a-f-]{36}/);
    expect(texto).not.toMatch(/Vandre|Sem Presenca/);
    expect(texto).not.toContain(TELEFONE);
    const saida = cli(banco.url);
    expect(saida.stdout + saida.stderr).not.toMatch(new RegExp(`Vandre|Sem Presenca|${TELEFONE}`));
  });

  it('não grava nada: o banco fica igual e a conexão recusa escrita', async () => {
    const fotografia = () =>
      banco.consultar(
        `SELECT (SELECT count(*) FROM jogadores) AS j, (SELECT count(*) FROM presencas) AS p,
                (SELECT count(*) FROM auditoria) AS a, (SELECT coalesce(string_agg(inicio_pontuacao::text, ','), '') FROM jogadores) AS s`,
      );
    const antes = await fotografia();
    await executarVerificacao();
    expect(await fotografia()).toEqual(antes);

    const periodoAberto = (
      await banco.consultar<{ jogador_id: string }>('SELECT jogador_id FROM periodos_ativos LIMIT 1')
    )[0]!;
    const codigo = await emLeitura(banco.db, async (tx) => {
      try {
        await jogadores.inativar(tx, banco.grupoId, periodoAberto.jogador_id, HOJE);
        return 'gravou';
      } catch (erro) {
        return (erro as { code?: string }).code;
      }
    });
    expect(codigo).toBe('25006');
  });

  it('o código do script não tem comando de escrita nem lê apelido e telefone', () => {
    const pasta = join(SCRIPTS, 'verificar-inicio');
    const arquivos = [join(SCRIPTS, 'verificar-inicio.ts'), ...readdirSync(pasta).map((f) => join(pasta, f))];
    for (const arquivo of arquivos) {
      const codigo = readFileSync(arquivo, 'utf8');
      expect(codigo, arquivo).not.toMatch(/\b(INSERT|UPDATE|DELETE|insertInto|updateTable|deleteFrom)\b/i);
      expect(codigo, arquivo).not.toMatch(/\.(apelido|telefone)\b/);
      expect(codigo, arquivo).not.toMatch(/argumento\(['"](url|database-url)/);
    }
  });

  it('diferença: acumulado de quem teve a data de início mudada sai com código 1', async () => {
    const kim = await inserirJogador('Kim Fictício', 20, '2026-09-20', ['2026-09-20']);
    await banco.consultar('UPDATE jogadores SET inicio_pontuacao = $1 WHERE id = $2', [HOJE, kim]);

    const r = await executarVerificacao();
    expect(r.diferencas).toBe(1);
    expect(r.linhas.filter((l) => l.includes('DIFERENTE'))).toHaveLength(1);
    expect(r.linhas.find((l) => l.includes('DIFERENTE'))).toContain(`jogador=${kim}`);
    expect(cli(banco.url).status).toBe(1);
  });

  it('sem DATABASE_URL falha com código 1 e sem detalhe', () => {
    const saida = cli(undefined);
    expect(saida.status).toBe(1);
    expect(saida.stdout).toBe('');
  });
});
