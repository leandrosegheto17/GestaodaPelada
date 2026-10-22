import { calcularRanking, type EntradaRanking } from '@pelada/dominio';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { carregarHistoricoGrupo } from '../../src/aplicacao/pontuacao/historico.js';
import { criarDb, fecharDb } from '../../src/infraestrutura/db/index.js';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { bancosDescartaveis, PASTA_MIGRACOES as PASTA } from '../apoio/banco-migracao.js';

const bancoAntesDaMigracao = bancosDescartaveis('202610201000_inicio_pontuacao.sql');
const HOJE = '2026-10-21';
const MESES = ['2026-08', '2026-09', '2026-10'];
const PARTIDAS = ['2026-08-30', '2026-09-06', '2026-09-20', '2026-09-27', '2026-10-11', '2026-10-18'];

interface JogadorDeProducao {
  apelido: string;
  inicial: number;
  periodos: Array<[string, string | null]>;
  presencas: string[];
}

/** Formato de produção: o início do período não tem relação com a primeira presença. */
const JOGADORES: JogadorDeProducao[] = [
  { apelido: 'Sem', inicial: 0, periodos: [['2026-08-01', null]], presencas: ['2026-09-20', '2026-10-11'] },
  // Período aberto em 20/10 com presenças de 20/09, 27/09 e 11/10.
  {
    apelido: 'Vandre',
    inicial: 3,
    periodos: [['2026-10-20', null]],
    presencas: ['2026-09-20', '2026-09-27', '2026-10-11'],
  },
  { apelido: 'Igual', inicial: 10, periodos: [['2026-09-27', null]], presencas: ['2026-09-27', '2026-10-18'] },
  { apelido: 'Inicial', inicial: 25, periodos: [['2026-08-01', null]], presencas: ['2026-09-06', '2026-10-18'] },
  { apelido: 'Nunca', inicial: 7, periodos: [['2026-09-01', null]], presencas: [] },
  {
    apelido: 'Saiu',
    inicial: 4,
    periodos: [
      ['2026-08-01', '2026-09-10'],
      ['2026-10-01', null],
    ],
    presencas: ['2026-08-30', '2026-10-11'],
  },
];

const PESOS = {
  vigenteDesde: '2026-01-01',
  registradoEm: '2026-01-01T00:00:00.000Z',
  presencaSemChuva: 1,
  presencaComChuva: 2,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 1,
  expulsoSemChuva: -2,
  expulsoComChuva: -3,
};

async function popular(cliente: pg.Client): Promise<string> {
  const conta = (
    await cliente.query<{ id: string }>(
      `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('ini@exemplo.test', 'Ini', 'x', now()) RETURNING id`,
    )
  ).rows[0]?.id as string;
  const grupo = (
    await cliente.query<{ id: string }>(
      `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
       VALUES ('Inicio', 'ini', 'quarta', 'semanal', '20:00', $1, now()) RETURNING id`,
      [conta],
    )
  ).rows[0]?.id as string;
  await cliente.query(
    `INSERT INTO config_pesos (grupo_id, vigente_desde, presenca_sem_chuva, presenca_com_chuva, lesionado_sem_chuva,
       lesionado_com_chuva, expulso, expulso_com_chuva, registrado_por, registrado_em)
     VALUES ($1, '2026-01-01', 1, 2, 1, 1, -2, -3, $2, now())`,
    [grupo, conta],
  );
  const partidaDe = new Map<string, string>();
  for (const [i, data] of PARTIDAS.entries()) {
    const id = (
      await cliente.query<{ id: string }>(
        `INSERT INTO partidas (grupo_id, data, choveu, criada_por, criada_em, alterada_por, alterada_em)
         VALUES ($1, $2, $3, $4, now(), $4, now()) RETURNING id`,
        [grupo, data, i % 2 === 1, conta],
      )
    ).rows[0]?.id as string;
    partidaDe.set(data, id);
  }
  for (const [i, j] of JOGADORES.entries()) {
    const id = (
      await cliente.query<{ id: string }>(
        `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, pontuacao_inicial, criado_por, criado_em, alterado_por, alterado_em)
         VALUES ($1, $2, $3, 'meia', $4, $5, now(), $5, now()) RETURNING id`,
        [grupo, j.apelido, 1980 + i, j.inicial, conta],
      )
    ).rows[0]?.id as string;
    for (const [inicio, fim] of j.periodos) {
      await cliente.query(`INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio, fim) VALUES ($1, $2, $3, $4)`, [
        id,
        grupo,
        inicio,
        fim,
      ]);
    }
    for (const data of j.presencas) {
      await cliente.query(
        `INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao) VALUES ($1, $2, $3, 'presente')`,
        [partidaDe.get(data), id, grupo],
      );
    }
  }
  return grupo;
}

/** O que o código de antes da coluna calculava: nenhum jogador com `inicioPontuacao`. */
async function entradaAntes(cliente: pg.Client, grupo: string): Promise<Omit<EntradaRanking, 'mes'>> {
  const jogadores = await cliente.query<{ id: string; apelido: string; ano: number; inicial: number }>(
    'SELECT id, apelido, ano_nascimento AS ano, pontuacao_inicial AS inicial FROM jogadores WHERE grupo_id = $1',
    [grupo],
  );
  const periodos = await cliente.query<{ jogador_id: string; inicio: string; fim: string | null }>(
    `SELECT jogador_id, inicio::text, fim::text FROM periodos_ativos WHERE grupo_id = $1 ORDER BY inicio`,
    [grupo],
  );
  const partidas = await cliente.query<{ id: string; data: string; choveu: boolean }>(
    'SELECT id, data::text, choveu FROM partidas WHERE grupo_id = $1 ORDER BY data',
    [grupo],
  );
  const presencas = await cliente.query<{ partidaId: string; jogadorId: string }>(
    `SELECT partida_id AS "partidaId", jogador_id AS "jogadorId" FROM presencas WHERE grupo_id = $1`,
    [grupo],
  );
  return {
    hoje: HOJE,
    jogadores: jogadores.rows.map((j) => ({
      id: j.id,
      apelido: j.apelido,
      anoNascimento: j.ano,
      pontuacaoInicial: j.inicial,
      periodos: periodos.rows.filter((p) => p.jogador_id === j.id).map((p) => ({ inicio: p.inicio, fim: p.fim })),
    })),
    partidas: partidas.rows,
    presencas: presencas.rows.map((p) => ({ ...p, situacao: 'presente' as const })),
    configsPesos: [PESOS],
  };
}

/** Posição e pontos de cada jogador no mês; `semFinalDe` tira o PTS FINAL de quem teve a rodada corrigida. */
const placar = (r: ReturnType<typeof calcularRanking>, semFinalDe?: string) =>
  r.linhas.map((l) => ({
    id: l.jogadorId,
    posicao: l.posicao,
    ini: l.ptsInicial,
    fim: l.jogadorId === semFinalDe ? null : l.ptsFinal,
  }));

describe('migração da data de início da pontuação', () => {
  it('preenche a data de início e deixa o ranking igual ao de antes, exceto quem saiu e voltou', async () => {
    const { cliente, url } = await bancoAntesDaMigracao();
    const db = criarDb({ connectionString: url }, { waitUntil: () => undefined });
    try {
      const grupo = await popular(cliente);
      const antes = await entradaAntes(cliente, grupo);
      const esperado = MESES.map((mes) => calcularRanking({ ...antes, mes }));

      await aplicarMigracoes(url, lerMigracoes(PASTA));

      const colunas = await cliente.query<{ apelido: string; inicio: string | null }>(
        `SELECT apelido, inicio_pontuacao::text AS inicio FROM jogadores WHERE grupo_id = $1 ORDER BY apelido`,
        [grupo],
      );
      expect(colunas.rows).toEqual([
        { apelido: 'Igual', inicio: '2026-09-27' },
        { apelido: 'Inicial', inicio: '2026-08-01' },
        { apelido: 'Nunca', inicio: '2026-09-01' },
        { apelido: 'Saiu', inicio: '2026-08-01' },
        { apelido: 'Sem', inicio: '2026-08-01' },
        { apelido: 'Vandre', inicio: '2026-09-20' },
      ]);

      const historico = await carregarHistoricoGrupo(db, grupo, HOJE);
      const depois = MESES.map((mes) => calcularRanking({ hoje: HOJE, mes, ...historico }));
      const vandreId = historico.jogadores.find((j) => j.apelido === 'Vandre')?.id;
      // Quem saiu e voltou ("Saiu", retorno em 01/10) recomeça a contagem no retorno: só ele muda de pontos e de
      // posição; os demais ficam como antes, na mesma ordem.
      const saiuId = historico.jogadores.find((j) => j.apelido === 'Saiu')?.id;
      const semSaiu = (r: ReturnType<typeof calcularRanking>) =>
        placar(r, vandreId)
          .filter((l) => l.id !== saiuId)
          .map(({ posicao: _posicao, ...resto }) => resto);
      expect(depois.map(semSaiu)).toEqual(esperado.map(semSaiu));
      const saiu = (r: ReturnType<typeof calcularRanking> | undefined) => r?.linhas.find((l) => l.jogadorId === saiuId);
      for (const i of [0, 1]) {
        expect([saiu(depois[i])?.ptsInicial, saiu(depois[i])?.ptsFinal]).toEqual([
          saiu(esperado[i])?.ptsInicial,
          saiu(esperado[i])?.ptsFinal,
        ]);
      }
      expect([saiu(depois[2])?.ptsInicial, saiu(depois[2])?.ptsFinal]).toEqual([0, 1]);

      // Só o jogador movido muda: o PTS FINAL de antes ignorava as presenças anteriores ao período (e por isso
      // não fechava com o PTS INICIAL do mês seguinte); agora fecha, e o acumulado de hoje é o mesmo de antes.
      expect(depois.map((r) => r.linhas.find((l) => l.jogadorId === vandreId)?.ptsFinal)).toEqual([3, 6, 7]);
      expect(depois[2]?.linhas.find((l) => l.jogadorId === vandreId)?.ptsInicial).toBe(6);
      for (const [i, r] of depois.entries()) {
        for (const linha of r.linhas.filter((l) => l.jogadorId !== vandreId)) {
          expect(linha.rodadas).toEqual(esperado[i]?.linhas.find((l) => l.jogadorId === linha.jogadorId)?.rodadas);
        }
      }
      const vandre = depois[1]?.linhas.find((l) => l.jogadorId === vandreId);
      expect(vandre?.rodadas.map((r) => r.situacao)).toEqual(['fora', 'presente', 'presente']);

      const periodos = await cliente.query<{ apelido: string; inicio: string; fim: string | null }>(
        `SELECT j.apelido, p.inicio::text, p.fim::text FROM periodos_ativos p JOIN jogadores j ON j.id = p.jogador_id
         WHERE p.grupo_id = $1 ORDER BY j.apelido, p.inicio`,
        [grupo],
      );
      expect(periodos.rows).toEqual([
        { apelido: 'Igual', inicio: '2026-09-27', fim: null },
        { apelido: 'Inicial', inicio: '2026-08-01', fim: null },
        { apelido: 'Nunca', inicio: '2026-09-01', fim: null },
        { apelido: 'Saiu', inicio: '2026-08-01', fim: '2026-09-10' },
        { apelido: 'Saiu', inicio: '2026-10-01', fim: null },
        { apelido: 'Sem', inicio: '2026-08-01', fim: null },
        { apelido: 'Vandre', inicio: '2026-09-20', fim: null },
      ]);
    } finally {
      await fecharDb(db);
      await cliente.end();
    }
  });

  it('é aditiva: a coluna é anulável e do tipo date', async () => {
    const { cliente, url } = await bancoAntesDaMigracao();
    try {
      await aplicarMigracoes(url, lerMigracoes(PASTA));
      const r = await cliente.query<{ is_nullable: string; data_type: string }>(
        `SELECT is_nullable, data_type FROM information_schema.columns
         WHERE table_name = 'jogadores' AND column_name = 'inicio_pontuacao'`,
      );
      expect(r.rows).toEqual([{ is_nullable: 'YES', data_type: 'date' }]);
    } finally {
      await cliente.end();
    }
  });
});
