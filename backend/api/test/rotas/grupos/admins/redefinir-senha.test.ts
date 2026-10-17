import { senhaExibida } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { SENHA_PADRAO } from '../../../apoio/fabricas/contas.js';
import { vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { relogioFixo } from '../../../apoio/relogio.js';
import { entrarComo } from '../../../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });
const entrar = (email: string, senha: string) => cliente().post('/api/sessao/entrar', { email, senha });

afterEach(() => vi.restoreAllMocks());

describe('POST /api/grupos/:g/admins/:contaId/redefinir-senha: casos de segurança (workerd)', () => {
  it('derruba todas as sessões do alvo e mantém a do autor', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const segunda = await entrarComo(db, fabrica, cen.adminASemFinanceiro.id);
    const r = await cliente(cen.adminA.cookie).post(
      `/api/grupos/${cen.grupoA.id}/admins/${cen.adminASemFinanceiro.id}/redefinir-senha`,
    );
    expect(r.status).toBe(200);
    expect((await cliente(cen.adminASemFinanceiro.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect((await cliente(segunda.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect((await cliente(cen.adminA.cookie).get('/api/sessao/eu')).status).toBe(200);
  });

  it('a própria conta é recusada e a senha segue valendo', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(
      `/api/grupos/${cen.grupoA.id}/admins/${cen.adminA.id}/redefinir-senha`,
    );
    expect(r.status).toBe(409);
    expect((await entrar(cen.adminA.email, SENHA_PADRAO)).status).toBe(204);
    expect((await cliente(cen.adminA.cookie).get('/api/sessao/eu')).status).toBe(200);
  });

  it('alvo de outro grupo e dono com vínculo dão o mesmo 404 do uuid inexistente, sem mudar a senha', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await vincularAdmin(db, cen.grupoA.id, cen.dono.id, { acessaFinanceiro: false });
    const base = `/api/grupos/${cen.grupoA.id}/admins`;
    const inexistente = await cliente(cen.adminA.cookie).post(`${base}/${randomUUID()}/redefinir-senha`);
    const alheio = await cliente(cen.adminA.cookie).post(`${base}/${cen.adminB.id}/redefinir-senha`);
    const dono = await cliente(cen.adminA.cookie).post(`${base}/${cen.dono.id}/redefinir-senha`);
    for (const r of [alheio, dono]) {
      expect(r.status).toBe(404);
      expect(r.texto).toBe(inexistente.texto);
      expect(r.headers.get('Cache-Control')).toBe(inexistente.headers.get('Cache-Control'));
    }
    expect((await entrar(cen.adminB.email, SENHA_PADRAO)).status).toBe(204);
    expect((await entrar(cen.dono.email, SENHA_PADRAO)).status).toBe(204);
  }, 30_000);

  it('uuid malformado é 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/admins/nao-e-uuid/redefinir-senha`);
    expect(r.status).toBe(404);
  });

  it('sem X-Pelada é 403; admin de outro grupo recebe 404 e a senha do alvo não muda', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/admins/${cen.adminASemFinanceiro.id}/redefinir-senha`;
    expect((await cliente(cen.adminA.cookie, true).post(url)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).post(url)).status).toBe(404);
    expect((await entrar(cen.adminASemFinanceiro.email, SENHA_PADRAO)).status).toBe(204);
  });

  it('a senha devolvida não aparece em console.*', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const r = await cliente(cen.adminA.cookie).post(
      `/api/grupos/${cen.grupoA.id}/admins/${cen.adminASemFinanceiro.id}/redefinir-senha`,
    );
    const { senhaTemporaria } = senhaExibida.parse(r.corpo);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    for (const e of espioes) expect(JSON.stringify(e.mock.calls)).not.toContain(senhaTemporaria);
  });
});
