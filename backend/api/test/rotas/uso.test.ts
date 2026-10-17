import { usoPorSemana } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import * as eventos from '../../src/infraestrutura/db/repositorios/eventos.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { diaRelativo, HOJE_TESTE, relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo(HOJE_TESTE, '12:00'), cookie });

/** Segunda-feira da semana de `data`. */
function segundaDe(data: string): string {
  const dia = new Date(`${data}T00:00:00Z`).getUTCDay();
  return diaRelativo(-((dia + 6) % 7), data);
}
const SEGUNDA_ATUAL = segundaDe(HOJE_TESTE);
const semana = (k: number) => diaRelativo(-7 * k, SEGUNDA_ATUAL);
/** Momento (UTC) de uma data local de São Paulo e hora. */
const em = (data: string, hora: string, somaHoras = 0) =>
  new Date(new Date(`${data}T${hora}:00-03:00`).getTime() + somaHoras * 3_600_000);
const disp = (n: number) => `123e4567-e89b-12d3-a456-42661417400${n}`;

describe('GET /api/grupos/:grupoId/uso (workerd)', () => {
  it('grupo sem eventos: semanas vazias', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/uso`);
    expect(r.status).toBe(200);
    expect(r.corpo).toEqual({ semanas: [] });
    expect(r.headers.get('cache-control')).toContain('no-store');
  });

  it('três semanas, mais recentes primeiro, com as contagens e só as chaves do contrato', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const jogo = semana(2); // grupo de fábrica joga às 20:00
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: disp(1), momento: em(semana(0), '10:00') });
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: disp(1), momento: em(semana(0), '11:00') });
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: disp(2), momento: em(semana(0), '12:00') });
    await eventos.registrar(db, g, {
      tipo: 'pdf_exportado',
      mes: semana(1).slice(0, 7),
      momento: em(semana(1), '09:00'),
    });
    await eventos.registrar(db, g, { tipo: 'partida_lancada', dataPartida: jogo, momento: em(jogo, '20:00', 1) });
    await eventos.registrar(db, g, { tipo: 'partida_lancada', dataPartida: jogo, momento: em(jogo, '20:00', 49) });
    await eventos.registrar(db, g, { tipo: 'escalacao_confirmada', dataPartida: jogo, momento: em(jogo, '08:00') });

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/uso`);
    expect(r.status).toBe(200);
    const corpo = usoPorSemana.parse(r.corpo);
    const base = {
      aparelhosRanking: 0,
      pdfsExportados: 0,
      partidasLancadas: 0,
      partidasEm48h: 0,
      escalacoesConfirmadas: 0,
    };
    const fim = (i: string) => diaRelativo(6, i);
    expect(corpo.semanas).toEqual([
      { ...base, inicio: semana(0), fim: fim(semana(0)), aparelhosRanking: 2 },
      { ...base, inicio: semana(1), fim: fim(semana(1)), pdfsExportados: 1 },
      {
        ...base,
        inicio: semana(2),
        fim: fim(semana(2)),
        partidasLancadas: 2,
        partidasEm48h: 1,
        escalacoesConfirmadas: 1,
      },
    ]);
    expect(Object.keys((r.corpo as { semanas: object[] }).semanas[0]!).sort()).toEqual(
      Object.keys(base).concat('fim', 'inicio').sort(),
    );
  });

  it('evento de outro grupo não entra na contagem', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await eventos.registrar(db, cen.grupoB.id, {
      tipo: 'pdf_exportado',
      mes: HOJE_TESTE.slice(0, 7),
      momento: em(semana(0), '09:00'),
    });
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/uso`);
    expect(r.corpo).toEqual({ semanas: [] });
  });

  it('acesso: sem sessão 401; outro grupo e id malformado 404; admin sem financeiro 200', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/uso`;
    expect((await cliente('').get(url)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).get(url)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get('/api/grupos/xyz/uso')).status).toBe(404);
    expect((await cliente(cen.adminASemFinanceiro.cookie).get(url)).status).toBe(200);
  });
});
