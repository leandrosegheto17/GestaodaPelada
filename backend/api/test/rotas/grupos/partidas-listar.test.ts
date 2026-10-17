import { partidasDoMes } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { diaRelativo, relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const HOJE = '2026-10-22';
const AGORA = new Date(relogioFixo(HOJE).agoraIso());
const MES = HOJE.slice(0, 7);
const MES_ANTERIOR = diaRelativo(-31, `${MES}-15`).slice(0, 7);
const cliente = (cookie?: string, hoje = HOJE) =>
  clienteTeste({ relogio: relogioFixo(hoje), ...(cookie ? { cookie } : {}) });

type Sit = 'presente' | 'lesionado' | 'expulso';

async function lancar(
  db: Db,
  grupoId: string,
  autor: string,
  data: string,
  choveu = false,
  jogadores: Array<[string, Sit]> = [],
) {
  await emTransacao(db, (tx) =>
    partidas.criar(tx, grupoId, {
      data,
      choveu,
      presencas: jogadores.map(([jogadorId, situacao]) => ({ jogadorId, situacao })),
      autor,
      agora: AGORA,
    }),
  );
}

describe('GET /api/grupos/:g/partidas (workerd)', () => {
  it('mês corrente: ordem decrescente, chuva, contagens P/L/E e navegação', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const [a, b, c] = (await Promise.all(
      ['Ana', 'Bia', 'Cris'].map((apelido) => criarJogador(db, g, cen.adminA.id, { apelido })),
    )) as [string, string, string];
    const d1 = `${MES}-01`;
    const d2 = diaRelativo(-7, HOJE);
    await lancar(db, g, cen.adminA.id, d1, false, [[a, 'presente']]);
    await lancar(db, g, cen.adminA.id, HOJE, false, [
      [a, 'presente'],
      [b, 'lesionado'],
      [c, 'expulso'],
    ]);
    await lancar(db, g, cen.adminA.id, d2, true, [
      [a, 'presente'],
      [b, 'presente'],
    ]);
    await lancar(db, g, cen.adminA.id, `${MES_ANTERIOR}-28`, false, []);

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('no-store');
    const corpo = partidasDoMes.parse(r.corpo);
    expect(corpo.mes).toBe(MES);
    expect(corpo.hoje).toBe(HOJE);
    expect(corpo.navegacao).toEqual({ mesAnterior: MES_ANTERIOR, mesSeguinte: null });
    expect(corpo.partidas).toEqual([
      { data: HOJE, choveu: false, contagem: { presentes: 1, lesionados: 1, expulsos: 1 } },
      { data: d2, choveu: true, contagem: { presentes: 2, lesionados: 0, expulsos: 0 } },
      { data: d1, choveu: false, contagem: { presentes: 1, lesionados: 0, expulsos: 0 } },
    ]);
  });

  it('mês passado sem partidas dentro dos limites: lista vazia com os dois botões', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const anterior2 = diaRelativo(-62, `${MES}-15`).slice(0, 7);
    await lancar(db, g, cen.adminA.id, `${anterior2}-10`);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=${MES_ANTERIOR}`);
    expect(r.status).toBe(200);
    const corpo = partidasDoMes.parse(r.corpo);
    expect(corpo.partidas).toEqual([]);
    expect(corpo.navegacao).toEqual({ mesAnterior: anterior2, mesSeguinte: MES });
  });

  it('mês da 1ª partida: sem anterior; grupo sem partidas: navegação nula; antes da 1ª: vazio', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const vazio = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas`);
    expect(partidasDoMes.parse(vazio.corpo).navegacao).toEqual({ mesAnterior: null, mesSeguinte: null });

    await lancar(db, g, cen.adminA.id, `${MES_ANTERIOR}-10`);
    const primeiro = partidasDoMes.parse(
      (await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=${MES_ANTERIOR}`)).corpo,
    );
    expect(primeiro.navegacao).toEqual({ mesAnterior: null, mesSeguinte: MES });
    expect(primeiro.partidas).toHaveLength(1);

    const antes = diaRelativo(-62, `${MES}-15`).slice(0, 7);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=${antes}`);
    expect(r.status).toBe(200);
    const corpo = partidasDoMes.parse(r.corpo);
    expect(corpo.partidas).toEqual([]);
    expect(corpo.navegacao.mesSeguinte).toBe(MES_ANTERIOR);
  });

  it('último dia do mês entra, dia 1 do seguinte não; virada de ano', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await lancar(db, g, cen.adminA.id, '2025-12-31');
    await lancar(db, g, cen.adminA.id, '2026-01-01');
    const jan = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=2026-01`);
    const j = partidasDoMes.parse(jan.corpo);
    expect(j.partidas.map((p) => p.data)).toEqual(['2026-01-01']);
    expect(j.navegacao.mesAnterior).toBe('2025-12');
    const dez = partidasDoMes.parse(
      (await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=2025-12`)).corpo,
    );
    expect(dez.partidas.map((p) => p.data)).toEqual(['2025-12-31']);
    expect(dez.navegacao.mesAnterior).toBeNull();
  });

  it('mês inválido ou futuro: 422 em campos.mes', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const futuro = diaRelativo(40, `${MES}-15`).slice(0, 7);
    for (const mes of ['2026-13', '2026-1', 'abc', '', futuro]) {
      const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=${mes}`);
      expect(r.status, mes).toBe(422);
      expect(JSON.stringify(r.corpo)).toContain('"mes"');
    }
  });

  it('isolamento: outro grupo 404, uuid malformado 404, sem sessão 401, partidas de B não aparecem', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await lancar(db, cen.grupoB.id, cen.adminB.id, HOJE);
    const g = cen.grupoA.id;
    const propria = partidasDoMes.parse((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas`)).corpo);
    expect(propria.partidas).toEqual([]);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoB.id}/partidas`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get('/api/grupos/nao-e-uuid/partidas')).status).toBe(404);
    expect((await cliente().get(`/api/grupos/${g}/partidas`)).status).toBe(401);
  });
});
