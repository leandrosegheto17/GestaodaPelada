import { describe, expect, it } from 'vitest';
import { prepararContexto } from '../../../src/aplicacao/simulador/contexto.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

// O grupo de fábrica joga às quintas-feiras: 2026-10-22 é quinta.
describe('prepararContexto (workerd)', () => {
  it.each([
    ['2026-10-22', '2026-10-22'],
    ['2026-10-23', '2026-10-29'],
    ['2026-10-30', '2026-11-05'],
  ])('hoje %s → data sugerida %s (hoje incluso, vira o mês)', async (hoje, esperada) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await prepararContexto(db, cen.grupoA.id, { hoje });
    expect(r).toMatchObject({ dataSugerida: esperada, hoje, jogadores: [] });
  });

  it('?data não muda a sugerida; entra e sai na data respeitam o intervalo semiaberto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Antigo', dataEntrada: '2026-01-01' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Depois', dataEntrada: '2026-11-01' });
    const saiu = await criarJogador(db, g, cen.adminA.id, { apelido: 'Saiu', dataEntrada: '2026-01-01' });
    await jogadores.inativar(db, g, saiu, '2026-10-15');
    const r = await prepararContexto(db, g, { hoje: '2026-10-22', data: '2026-10-22' });
    expect(r?.jogadores.map((j) => j.apelido)).toEqual(['Antigo']);
    const outra = await prepararContexto(db, g, { hoje: '2026-10-22', data: '2026-11-05' });
    expect(outra?.dataSugerida).toBe('2026-10-22');
    expect(outra?.jogadores.map((j) => j.apelido)).toEqual(['Antigo', 'Depois']);
  });

  it('ordem alfabética com acento e nível: 6.8 com notas, 5.5 e semNota sem elas', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const comNotas = await criarJogador(db, g, cen.adminA.id, { apelido: 'Édson' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Zeca' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana' });
    const notas = [8, 7, 6, 7, 8, 5];
    for (const [i, nota] of notas.entries()) {
      const h = await habilidades.criar(db, g, `Hab ${i}`);
      await habilidades.gravarNota(db, g, comNotas, h, nota);
    }
    const r = await prepararContexto(db, g, { hoje: '2026-10-22' });
    expect(r?.jogadores.map((j) => [j.apelido, j.nivel, j.semNota])).toEqual([
      ['Ana', 5.5, true],
      ['Édson', 6.8, false],
      ['Zeca', 5.5, true],
    ]);
  });

  it('só id, apelido, nível e semNota; a nota de outro grupo não interfere', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const doA = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    const hb = await habilidades.criar(db, cen.grupoB.id, 'Passe');
    await habilidades.gravarNota(db, cen.grupoB.id, doB, hb, 10);
    const r = await prepararContexto(db, cen.grupoA.id, { hoje: '2026-10-22' });
    expect(Object.keys(r?.jogadores[0] ?? {}).sort()).toEqual(['apelido', 'id', 'nivel', 'semNota']);
    expect(r?.jogadores.map((j) => j.id)).toEqual([doA]);
    expect(r?.jogadores[0]?.semNota).toBe(true);
  });
});
