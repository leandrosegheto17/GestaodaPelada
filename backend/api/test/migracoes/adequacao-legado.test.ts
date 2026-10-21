import { describe, expect, it } from 'vitest';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { bancosDescartaveis, PASTA_MIGRACOES as PASTA } from '../apoio/banco-migracao.js';

const NOVA = '202610200000_adequacao_legado.sql';
const bancoAntesDaMigracao = bancosDescartaveis(NOVA);

describe('migração de adequação ao legado', () => {
  it('converte posições, zera a pontuação inicial e copia o expulso para o expulso com chuva', async () => {
    const { cliente, url } = await bancoAntesDaMigracao();
    try {
      const conta = (
        await cliente.query<{ id: string }>(
          `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('mig@exemplo.test', 'Mig', 'x', now()) RETURNING id`,
        )
      ).rows[0]?.id as string;
      const grupo = (
        await cliente.query<{ id: string }>(
          `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
           VALUES ('Migracao', 'mig', 'quarta', 'semanal', '20:00', $1, now()) RETURNING id`,
          [conta],
        )
      ).rows[0]?.id as string;
      for (const [apelido, posicao] of [
        ['Def', 'defensor'],
        ['Meio', 'meio_campo'],
        ['Gol', 'goleiro'],
        ['Ata', 'atacante'],
      ] as const) {
        await cliente.query(
          `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, criado_por, criado_em, alterado_por, alterado_em)
           VALUES ($1, $2, 1990, $3, $4, now(), $4, now())`,
          [grupo, apelido, posicao, conta],
        );
      }
      await cliente.query(
        `INSERT INTO config_pesos (grupo_id, vigente_desde, presenca_sem_chuva, presenca_com_chuva, lesionado_sem_chuva,
           lesionado_com_chuva, expulso, registrado_por, registrado_em) VALUES ($1, '2026-01-01', 1, 1, 1, 1, -2, $2, now())`,
        [grupo, conta],
      );

      await aplicarMigracoes(
        url,
        lerMigracoes(PASTA).filter((m) => m.nome === NOVA || m.nome < NOVA),
      );

      const jogadores = await cliente.query<{ apelido: string; posicao: string; pontuacao_inicial: number }>(
        'SELECT apelido, posicao, pontuacao_inicial FROM jogadores ORDER BY apelido',
      );
      expect(jogadores.rows).toEqual([
        { apelido: 'Ata', posicao: 'atacante', pontuacao_inicial: 0 },
        { apelido: 'Def', posicao: 'zagueiro', pontuacao_inicial: 0 },
        { apelido: 'Gol', posicao: 'goleiro', pontuacao_inicial: 0 },
        { apelido: 'Meio', posicao: 'meia', pontuacao_inicial: 0 },
      ]);
      const pesos = await cliente.query<{ expulso: number; expulso_com_chuva: number }>(
        'SELECT expulso, expulso_com_chuva FROM config_pesos',
      );
      expect(pesos.rows).toEqual([{ expulso: -2, expulso_com_chuva: -2 }]);

      // Segunda aplicação: o runner pula a migração e nada muda.
      await aplicarMigracoes(url, lerMigracoes(PASTA));
      const outra = await aplicarMigracoes(url, lerMigracoes(PASTA));
      expect(outra.aplicadas).toEqual([]);
      const antigas = await cliente.query("SELECT 1 FROM jogadores WHERE posicao IN ('defensor', 'meio_campo')");
      expect(antigas.rowCount).toBe(0);
    } finally {
      await cliente.end();
    }
  });

  it('aceita as sete posições novas e a pontuação inicial de 0 a 9999; recusa o resto', async () => {
    const { cliente, url } = await bancoAntesDaMigracao();
    try {
      await aplicarMigracoes(url, lerMigracoes(PASTA));
      const conta = (
        await cliente.query<{ id: string }>(
          `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('mig2@exemplo.test', 'Mig', 'x', now()) RETURNING id`,
        )
      ).rows[0]?.id as string;
      const grupo = (
        await cliente.query<{ id: string }>(
          `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
           VALUES ('Migracao2', 'mig2', 'quarta', 'semanal', '20:00', $1, now()) RETURNING id`,
          [conta],
        )
      ).rows[0]?.id as string;
      const inserir = async (apelido: string, posicao: string, inicial: number): Promise<string | null> => {
        try {
          await cliente.query(
            `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, pontuacao_inicial, criado_por, criado_em, alterado_por, alterado_em)
             VALUES ($1, $2, 1990, $3, $4, $5, now(), $5, now())`,
            [grupo, apelido, posicao, inicial, conta],
          );
          return null;
        } catch (erro) {
          return (erro as { code?: string }).code ?? 'sem-codigo';
        }
      };
      const posicoes = ['zagueiro', 'lateral', 'volante', 'meia', 'atacante', 'centroavante', 'goleiro'];
      for (const [i, p] of posicoes.entries()) expect(await inserir(`P${i}`, p, 0)).toBeNull();
      expect(await inserir('Max', 'meia', 9999)).toBeNull();
      expect(await inserir('Neg', 'meia', -1)).toBe('23514');
      expect(await inserir('Estouro', 'meia', 10000)).toBe('23514');
      expect(await inserir('Ponta', 'ponta', 0)).toBe('23514');
      expect(await inserir('Antigo1', 'defensor', 0)).toBe('23514');
      expect(await inserir('Antigo2', 'meio_campo', 0)).toBe('23514');
    } finally {
      await cliente.end();
    }
  });

  it('a contração do CHECK converte linha antiga antes de restringir e deixa só as sete posições', async () => {
    const { cliente, url } = await bancoAntesDaMigracao();
    try {
      const conta = (
        await cliente.query<{ id: string }>(
          `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('mig3@exemplo.test', 'Mig', 'x', now()) RETURNING id`,
        )
      ).rows[0]?.id as string;
      const grupo = (
        await cliente.query<{ id: string }>(
          `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
           VALUES ('Migracao3', 'mig3', 'quarta', 'semanal', '20:00', $1, now()) RETURNING id`,
          [conta],
        )
      ).rows[0]?.id as string;
      for (const [apelido, posicao] of [
        ['Def', 'defensor'],
        ['Meio', 'meio_campo'],
      ] as const) {
        await cliente.query(
          `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, criado_por, criado_em, alterado_por, alterado_em)
           VALUES ($1, $2, 1990, $3, $4, now(), $4, now())`,
          [grupo, apelido, posicao, conta],
        );
      }
      await aplicarMigracoes(url, lerMigracoes(PASTA));

      const posicoes = await cliente.query<{ posicao: string }>('SELECT posicao FROM jogadores ORDER BY apelido');
      expect(posicoes.rows.map((l) => l.posicao)).toEqual(['zagueiro', 'meia']);
      const definicao = await cliente.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'jogadores_posicao_check'`,
      );
      expect(definicao.rows[0]?.def).not.toMatch(/defensor|meio_campo/);
    } finally {
      await cliente.end();
    }
  });
});
