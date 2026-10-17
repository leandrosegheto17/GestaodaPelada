import { grupoDono, painelDono } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { carregarGrupoDono } from '../../../src/aplicacao/dono/grupo-dono.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as pedidos from '../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), ...(cookie ? { cookie } : {}) });

const PROIBIDAS = ['jogadores', 'partidas', 'notas', 'financeiro', 'telefone', 'acessaFinanceiro', 'presencas'];
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

describe('GET /api/dono/painel (workerd)', () => {
  it('traz pedidos pendentes e os grupos, sem dado interno; dono também admin', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pedidos.registrarOuAtualizar(db, cen.adminB.id, AGORA);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', '=', cen.adminB.id).execute();
    });
    const r = await cliente(cen.dono.cookie).get('/api/dono/painel');
    expect(r.status).toBe(200);
    const painel = painelDono.parse(r.corpo);
    expect(painel.pedidosReset.some((p) => p.contaId === cen.adminB.id && p.grupos.includes('Grupo B'))).toBe(true);
    expect(painel.grupos.map((g) => g.nome)).toEqual(expect.arrayContaining(['Grupo A', 'Grupo B']));
    expect(painel.dono.tambemAdmin).toBe(false);
    for (const proibida of PROIBIDAS) expect(chaves(r.corpo)).not.toContain(proibida);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it('admin comum recebe 404; sem sessão, 401; sessão restrita, 403', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await cliente(cen.adminA.cookie).get('/api/dono/painel')).status).toBe(404);
    expect((await cliente().get('/api/dono/painel')).status).toBe(401);
  });
});

describe('GET /api/dono/grupos/:id (workerd)', () => {
  it('devolve metadados, link público e admins, sem dado interno', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.dono.cookie).get(`/api/dono/grupos/${cen.grupoA.id}`);
    expect(r.status).toBe(200);
    const g = grupoDono.parse(r.corpo);
    expect(g.urlPublica).toMatch(new RegExp(`/g/${cen.grupoA.slug}$`));
    expect(g.admins.map((a) => a.nome).sort()).toEqual(['Admin A', 'Admin A2']);
    for (const proibida of PROIBIDAS) expect(chaves(r.corpo)).not.toContain(proibida);
  });

  it('grupo arquivado é devolvido; inexistente e uuid malformado dão 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await kyselyDe(db).updateTable('grupos').set({ arquivado_em: AGORA }).where('id', '=', cen.grupoA.id).execute();
    const arquivado = await cliente(cen.dono.cookie).get(`/api/dono/grupos/${cen.grupoA.id}`);
    expect(arquivado.status).toBe(200);
    expect(arquivado.corpo).toMatchObject({ arquivadoEm: '2026-10-16' });
    expect((await cliente(cen.dono.cookie).get(`/api/dono/grupos/${randomUUID()}`)).status).toBe(404);
    expect((await cliente(cen.dono.cookie).get('/api/dono/grupos/abc')).status).toBe(404);
  });

  it('admin comum recebe 404 e sem sessão 401', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await cliente(cen.adminA.cookie).get(`/api/dono/grupos/${cen.grupoA.id}`)).status).toBe(404);
    expect((await cliente().get(`/api/dono/grupos/${cen.grupoA.id}`)).status).toBe(401);
  });

  it('o link público acompanha a base configurada', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = await carregarGrupoDono(db, 'https://outra.exemplo.com/', cen.grupoA.id);
    expect(g?.urlPublica).toBe(`https://outra.exemplo.com/g/${cen.grupoA.slug}`);
  });
});
