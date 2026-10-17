import { rankingPublico, usoPorSemana } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const anonimo = () => clienteTeste({ relogio: relogioFixo('2026-10-22') });
const logado = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });
const DISPOSITIVO = '123e4567-e89b-12d3-a456-426614174000';

const PROIBIDAS = ['telefone', 'anoNascimento', 'idade', 'notas', 'nivel', 'saldo', 'jogadorId', 'email', 'id'];
function chaves(no: unknown, saida: string[] = []): string[] {
  if (Array.isArray(no)) no.forEach((n) => chaves(n, saida));
  else if (no && typeof no === 'object') {
    for (const [k, v] of Object.entries(no)) {
      saida.push(k);
      chaves(v, saida);
    }
  }
  return saida;
}

async function grupoComHistorico(db: Awaited<ReturnType<typeof abrir>>) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01', ano: 1990 });
  const b = await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', dataEntrada: '2026-01-01', ano: 1985 });
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-01-01',
    registradoPor: cen.adminA.id,
    agora: AGORA,
  });
  for (const [data, presencas] of [
    ['2026-09-24', [{ jogadorId: a, situacao: 'presente' as const }]],
    [
      '2026-10-08',
      [
        { jogadorId: a, situacao: 'presente' as const },
        { jogadorId: b, situacao: 'expulso' as const },
      ],
    ],
  ] as const) {
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, { data, choveu: false, presencas: [...presencas], autor: cen.adminA.id, agora: AGORA }),
    );
  }
  return cen;
}

describe('GET /api/publico/:slug/ranking (workerd)', () => {
  it('ranking do mês sem login, na projeção estrita e sem campo proibido', async () => {
    const cen = await grupoComHistorico(await abrir());
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`);
    expect(r.status).toBe(200);
    const ranking = rankingPublico.parse(r.corpo);
    expect(ranking.grupo.slug).toBe(cen.grupoA.slug);
    expect(ranking.linhas.map((l) => [l.posicao, l.apelido, l.ptsInicial, l.ptsFinal])).toEqual([
      [1, 'Ana', 1, 2],
      [2, 'Beto', 0, -1],
    ]);
    expect(ranking.geradoEm).toBe('2026-10-22T15:00:00.000Z');
    expect(ranking.enderecoNovo ?? null).toBeNull();
    expect(ranking.navegacao).toEqual({ mesAnterior: '2026-09', mesSeguinte: null });
    for (const proibida of PROIBIDAS) expect(chaves(r.corpo)).not.toContain(proibida);
  });

  it('slug inexistente, malformado ou de grupo arquivado: o mesmo 404; mês fora dos limites: 422', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    const url = `/api/publico/${cen.grupoA.slug}/ranking`;
    expect((await anonimo().get(`${url}?mes=2026-11`)).status).toBe(422);
    expect((await anonimo().get(`${url}?mes=2026-08`)).status).toBe(422);
    expect((await anonimo().get(`${url}?mes=2026-13`)).status).toBe(422);
    const inexistente = await anonimo().get('/api/publico/nao-existe-xyz/ranking');
    const malformado = await anonimo().get('/api/publico/Maiuscula!/ranking');
    await kyselyDe(db).updateTable('grupos').set({ arquivado_em: AGORA }).where('id', '=', cen.grupoA.id).execute();
    const arquivado = await anonimo().get(url);
    expect(inexistente.status).toBe(404);
    expect(malformado.texto).toBe(inexistente.texto);
    expect(arquivado.texto).toBe(inexistente.texto);
  });

  it('grupo sem partidas: só o mês de hoje, com navegação nula', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pesos.criarPadrao(db, cen.grupoB.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-01-01',
      registradoPor: cen.adminB.id,
      agora: AGORA,
    });
    const url = `/api/publico/${cen.grupoB.slug}/ranking`;
    const r = await anonimo().get(url);
    expect(rankingPublico.parse(r.corpo).navegacao).toEqual({ mesAnterior: null, mesSeguinte: null });
    expect((await anonimo().get(`${url}?mes=2026-09`)).status).toBe(422);
  });
});

describe('POST /api/publico/:slug/eventos (workerd)', () => {
  it('grava só os dois tipos fechados e devolve 204', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/publico/${cen.grupoA.slug}/eventos`;
    expect((await anonimo().post(url, { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO })).status).toBe(204);
    expect((await anonimo().post(url, { tipo: 'pdf_exportado', mes: '2026-10' })).status).toBe(204);
    const linhas = await kyselyDe(db)
      .selectFrom('eventos_uso')
      .select(['tipo', 'dispositivo_id', 'mes_exportado'])
      .where('grupo_id', '=', cen.grupoA.id)
      .execute();
    expect(linhas).toHaveLength(2);
    for (const ruim of [
      { tipo: 'pagina_vista' },
      { tipo: 'ranking_aberto', dispositivoId: 'x' },
      { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO, ip: '1.2.3.4' },
      { tipo: 'pdf_exportado', mes: '2026-13' },
    ]) {
      expect((await anonimo().post(url, ruim)).status).toBe(422);
    }
    expect(
      (await anonimo().post('/api/publico/nao-existe/eventos', { tipo: 'pdf_exportado', mes: '2026-10' })).status,
    ).toBe(404);
  });

  it('corpo acima de 1 KB: 413, também sem Content-Length', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/publico/${cen.grupoA.slug}/eventos`;
    const grande = { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO, lixo: 'x'.repeat(1100) };
    expect((await anonimo().post(url, grande)).status).toBe(413);
  });
});

describe('GET /api/grupos/:g/uso (workerd)', () => {
  it('semanas mais recentes primeiro; qualquer admin do grupo; outro grupo 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/publico/${cen.grupoA.slug}/eventos`;
    await anonimo().post(url, { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO });
    const r = await logado(cen.adminASemFinanceiro.cookie).get(`/api/grupos/${cen.grupoA.id}/uso`);
    expect(r.status).toBe(200);
    const uso = usoPorSemana.parse(r.corpo);
    expect(uso.semanas).toMatchObject([{ inicio: '2026-10-19', fim: '2026-10-25', aparelhosRanking: 1 }]);
    expect((await logado(cen.adminB.cookie).get(`/api/grupos/${cen.grupoA.id}/uso`)).status).toBe(404);
    const vazio = await logado(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/uso`);
    expect(vazio.corpo).toEqual({ semanas: [] });
  });
});
