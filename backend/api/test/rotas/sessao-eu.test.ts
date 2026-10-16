import { sessaoEu } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../apoio/fabricas/grupos.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const t0 = new Date(relogioFixo('2026-10-16').agoraIso());
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), ...(cookie ? { cookie } : {}) });

describe('GET /api/sessao/eu (workerd)', () => {
  it('sem cookie: 401 no formato padrão', async () => {
    const r = await cliente().get('/api/sessao/eu');
    expect(r.status).toBe(401);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'nao_autenticado' } });
  });

  it('admin com dois grupos e um arquivado: só os ativos, por nome, com financeiro correto', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const beta = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Beta' });
    const alfa = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Alfa' });
    const velho = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Arquivado' });
    await vincularAdmin(db, beta.id, conta.id, { acessaFinanceiro: false });
    await vincularAdmin(db, alfa.id, conta.id, { acessaFinanceiro: true });
    await vincularAdmin(db, velho.id, conta.id);
    await kyselyDe(db).updateTable('grupos').set({ arquivado_em: t0 }).where('id', '=', velho.id).execute();
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });

    const r = await cliente(cookie).get('/api/sessao/eu');
    expect(r.status).toBe(200);
    const eu = sessaoEu.parse(r.corpo);
    expect(eu.grupos.map((g) => [g.nome, g.acessaFinanceiro])).toEqual([
      ['Alfa', true],
      ['Beta', false],
    ]);
    expect(eu.conta.id).toBe(conta.id);
    expect(r.texto).not.toMatch(/senha|hash/i);
  });

  it('sem vínculos: grupos vazios; aviso não visto: false; dono marcado', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const r = await cliente(cookie).get('/api/sessao/eu');
    expect(r.corpo).toMatchObject({ grupos: [], avisoPrivacidadeVisto: false, conta: { eDono: false } });
  });

  it('escopo troca_de_senha: 200 com o escopo e sem grupos', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const grupo = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    await vincularAdmin(db, grupo.id, conta.id);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    const r = await cliente(cookie).get('/api/sessao/eu');
    expect(r.corpo).toMatchObject({ escopo: 'troca_de_senha', grupos: [] });
  });
});
