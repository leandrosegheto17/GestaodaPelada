import { usoPorSemana } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const anonimo = () => clienteTeste({ relogio: relogioFixo('2026-10-22') });
const logado = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });
const DISPOSITIVO = '123e4567-e89b-12d3-a456-426614174000';

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
