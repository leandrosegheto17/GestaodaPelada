import { jogadorDetalhe } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}) });

describe('GET /api/grupos/:g/jogadores/:id (workerd)', () => {
  it('200 validado, no-store; inexistente, de outro grupo e malformado dão o mesmo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id);
    await habilidades.criar(db, g, 'Passe');
    const url = (i: string, grupo = g) => `/api/grupos/${grupo}/jogadores/${i}`;

    const ok = await cliente(cen.adminA.cookie).get(url(id));
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
    expect(jogadorDetalhe.safeParse(ok.corpo).success).toBe(true);

    const inexistente = await cliente(cen.adminA.cookie).get(url(randomUUID()));
    expect(inexistente.status).toBe(404);
    const doOutro = await cliente(cen.adminA.cookie).get(url(id, cen.grupoB.id));
    expect(doOutro.status).toBe(404);
    const deB = await cliente(cen.adminB.cookie).get(url(id));
    expect(deB.status).toBe(404);
    expect(deB.corpo).toEqual(inexistente.corpo);
    for (const ruim of ['abc', encodeURIComponent("' OR 1=1")]) {
      const r = await cliente(cen.adminA.cookie).get(url(ruim));
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual(inexistente.corpo);
    }
    expect((await cliente().get(url(id))).status).toBe(401);
  });
});
