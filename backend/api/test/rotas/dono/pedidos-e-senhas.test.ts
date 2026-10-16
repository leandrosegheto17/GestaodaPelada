import { senhaExibida } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as pedidos from '../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import { entrarComo } from '../../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });

describe('POST /api/dono/pedidos-reset/:id/resolver (workerd)', () => {
  it('resolve o pedido da conta; repetir e conta sem pedido dão 404; outro pedido segue', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pedidos.registrarOuAtualizar(db, cen.adminA.id, AGORA);
    await pedidos.registrarOuAtualizar(db, cen.adminB.id, AGORA);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', 'in', [cen.adminA.id, cen.adminB.id]).execute();
    });
    const r = await cliente(cen.dono.cookie).post(`/api/dono/pedidos-reset/${cen.adminA.id}/resolver`);
    expect(r.status).toBe(204);
    const pendentes = (await pedidos.listarPendentes(db)).map((p) => p.contaId);
    expect(pendentes).not.toContain(cen.adminA.id);
    expect(pendentes).toContain(cen.adminB.id);
    expect((await cliente(cen.dono.cookie).post(`/api/dono/pedidos-reset/${cen.adminA.id}/resolver`)).status).toBe(404);
    expect((await cliente(cen.dono.cookie).post(`/api/dono/pedidos-reset/${randomUUID()}/resolver`)).status).toBe(404);
    expect((await cliente(cen.dono.cookie).post('/api/dono/pedidos-reset/abc/resolver')).status).toBe(404);
  });

  it('permissões: admin comum 404, sem sessão 401, sem X-Pelada 403', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/dono/pedidos-reset/${cen.adminA.id}/resolver`;
    expect((await cliente(cen.adminA.cookie).post(url)).status).toBe(404);
    expect((await cliente().post(url)).status).toBe(401);
    expect((await cliente(cen.dono.cookie, true).post(url)).status).toBe(403);
  });
});

describe('POST /api/dono/contas/:id/redefinir-senha (workerd)', () => {
  it('redefine a senha de um admin: senha uma vez, sessões antigas caem, pedido some', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('auditoria').where('entidade_id', '=', cen.adminB.id).execute();
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', '=', cen.adminB.id).execute();
    });
    await pedidos.registrarOuAtualizar(db, cen.adminB.id, AGORA);
    const r = await cliente(cen.dono.cookie).post(`/api/dono/contas/${cen.adminB.id}/redefinir-senha`);
    expect(r.status).toBe(200);
    const exibida = senhaExibida.parse(r.corpo);
    expect(exibida.senhaTemporaria).toHaveLength(12);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect((await cliente(cen.adminB.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === cen.adminB.id)).toBe(false);
    const entrada = await cliente().post('/api/sessao/entrar', {
      email: cen.adminB.email,
      senha: exibida.senhaTemporaria,
    });
    expect(entrada.status).toBe(204);
  });

  it('conta do dono e conta inexistente recebem o mesmo 404; a sessão do dono continua', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const outroDono = await entrarComo(db, fabrica, cen.dono.id);
    const doDono = await cliente(cen.dono.cookie).post(`/api/dono/contas/${cen.dono.id}/redefinir-senha`);
    const inexistente = await cliente(cen.dono.cookie).post(`/api/dono/contas/${randomUUID()}/redefinir-senha`);
    expect(doDono.status).toBe(404);
    expect(doDono.texto).toBe(inexistente.texto);
    expect((await cliente(outroDono.cookie).get('/api/sessao/eu')).status).toBe(200);
  });

  it('malformado 404, admin comum 404, sem sessão 401, sem X-Pelada 403', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/dono/contas/${cen.adminA.id}/redefinir-senha`;
    expect((await cliente(cen.dono.cookie).post('/api/dono/contas/abc/redefinir-senha')).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).post(url)).status).toBe(404);
    expect((await cliente().post(url)).status).toBe(401);
    expect((await cliente(cen.dono.cookie, true).post(url)).status).toBe(403);
  });
});
