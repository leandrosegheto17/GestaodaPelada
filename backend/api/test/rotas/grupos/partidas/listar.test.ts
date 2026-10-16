import { partidasDoMes } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });

async function lancar(
  db: Awaited<ReturnType<typeof abrir>>,
  grupoId: string,
  autor: string,
  data: string,
  choveu: boolean,
  presencas: partidas.PresencaGravada[],
) {
  await emTransacao(db, (tx) => partidas.criar(tx, grupoId, { data, choveu, presencas, autor, agora: AGORA }));
}

describe('GET /api/grupos/:g/partidas (workerd)', () => {
  it('mês corrente em ordem decrescente, com contagem e limites de navegação', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const a = await criarJogador(db, g, cen.adminA.id);
    const b = await criarJogador(db, g, cen.adminA.id);
    await lancar(db, g, cen.adminA.id, '2026-09-24', false, [{ jogadorId: a, situacao: 'presente' }]);
    await lancar(db, g, cen.adminA.id, '2026-10-01', false, [{ jogadorId: a, situacao: 'presente' }]);
    await lancar(db, g, cen.adminA.id, '2026-10-08', true, [
      { jogadorId: a, situacao: 'presente' },
      { jogadorId: b, situacao: 'lesionado' },
    ]);
    await lancar(db, g, cen.adminA.id, '2026-10-15', false, [{ jogadorId: b, situacao: 'expulso' }]);

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas`);
    expect(r.status).toBe(200);
    const mes = partidasDoMes.parse(r.corpo);
    expect(mes.mes).toBe('2026-10');
    expect(mes.partidas.map((p) => p.data)).toEqual(['2026-10-15', '2026-10-08', '2026-10-01']);
    expect(mes.partidas[1]).toMatchObject({ choveu: true, contagem: { presentes: 1, lesionados: 1, expulsos: 0 } });
    expect(mes.navegacao).toEqual({ mesAnterior: '2026-09', mesSeguinte: null });
    const setembro = partidasDoMes.parse(
      (await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=2026-09`)).corpo,
    );
    expect(setembro.navegacao).toEqual({ mesAnterior: null, mesSeguinte: '2026-10' });
  });

  it('grupo sem partidas tem navegação nula; mês futuro e formato inválido dão 422', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const g = cen.grupoA.id;
    const vazio = partidasDoMes.parse((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas`)).corpo);
    expect(vazio.partidas).toEqual([]);
    expect(vazio.navegacao).toEqual({ mesAnterior: null, mesSeguinte: null });
    for (const ruim of ['2026-13', '2026-1', 'lixo', '2026-11']) {
      const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas?mes=${ruim}`);
      expect(r.status, ruim).toBe(422);
      expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['mes']);
    }
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${g}/partidas`)).status).toBe(404);
  });
});
