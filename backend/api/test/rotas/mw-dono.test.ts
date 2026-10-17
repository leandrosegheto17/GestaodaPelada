import { describe, expect, it } from 'vitest';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { comEco } from '../apoio/eco-rotas.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

describe('middleware de dono (workerd)', () => {
  it('eDono passa, admin comum recebe 404 e o dono sem vínculo não vê o grupo', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await comEco(cen.dono.cookie).get('/api/dono/eco')).status).toBe(200);
    expect((await comEco(cen.adminA.cookie).get('/api/dono/eco')).status).toBe(404);
    expect((await comEco(cen.dono.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);
  });

  it('sem sessão: 401', async () => {
    await montarCenario(await abrir(), fabrica);
    expect((await comEco().get('/api/dono/eco')).status).toBe(401);
  });

  it('dono com sessão de escopo troca_de_senha: 403 troca_de_senha_obrigatoria, não 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const parcial = await entrarComo(db, fabrica, cen.dono.id, { escopo: 'troca_de_senha' });
    const r = await comEco(parcial.cookie).get('/api/dono/eco');
    expect(r.status).toBe(403);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'troca_de_senha_obrigatoria' } });
  });
});
