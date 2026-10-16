import { adminAdicionado, erroPadrao, listaAdmins, senhaExibida } from '@pelada/contrato';
import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as pedidos from '../../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });
const emailNovo = () => `novo-${randomBytes(4).toString('hex')}@teste.invalid`;

describe('GET /api/grupos/:g/admins (workerd)', () => {
  it('lista por nome, marca "voce" e diz se pode gerir o financeiro', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`);
    expect(r.status).toBe(200);
    const lista = listaAdmins.parse(r.corpo);
    expect(lista.admins.map((a) => [a.nome, a.voce, a.acessaFinanceiro])).toEqual([
      ['Admin A', true, true],
      ['Admin A2', false, false],
    ]);
    expect(lista.podeGerirFinanceiro).toBe(true);
    expect(r.texto).not.toMatch(/senha|hash/i);
    const sem = await cliente(cen.adminASemFinanceiro.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`);
    expect((sem.corpo as { podeGerirFinanceiro: boolean }).podeGerirFinanceiro).toBe(false);
  });
});

describe('POST /api/grupos/:g/admins (workerd)', () => {
  it('e-mail novo: 201 com senha temporária; e-mail de outro grupo: só vínculo', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const email = emailNovo();
    const novo = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/admins`, {
      nome: 'Rodrigo',
      email,
    });
    expect(novo.status).toBe(201);
    const criado = adminAdicionado.parse(novo.corpo);
    expect(criado.contaNova).toBe(true);
    expect(novo.headers.get('Cache-Control')).toBe('no-store');
    fabrica.registrar(async () => {
      const banco = kyselyDe(db);
      await banco.deleteFrom('auditoria').where('entidade_id', '=', criado.contaId).execute();
      await banco.deleteFrom('vinculos_admin').where('conta_id', '=', criado.contaId).execute();
      await banco.deleteFrom('sessoes').where('conta_id', '=', criado.contaId).execute();
      await banco.deleteFrom('contas').where('id', '=', criado.contaId).execute();
    });
    const vinculo = await kyselyDe(db)
      .selectFrom('vinculos_admin')
      .select('acessa_financeiro')
      .where('conta_id', '=', criado.contaId)
      .executeTakeFirst();
    expect(vinculo?.acessa_financeiro).toBe(false);
    const entrada = await cliente().post('/api/sessao/entrar', { email, senha: criado.senhaTemporaria });
    expect(entrada.status).toBe(204);

    const existente = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/admins`, {
      nome: 'Outro Nome',
      email: ` ${cen.adminB.email.toUpperCase()} `,
    });
    expect(existente.status).toBe(201);
    expect(existente.corpo).toMatchObject({ contaNova: false, senhaTemporaria: null });
    const repetido = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/admins`, {
      nome: 'X Y',
      email: cen.adminB.email,
    });
    expect(repetido.status).toBe(409);
    expect(repetido.corpo).toMatchObject({ erro: { codigo: 'admin_ja_vinculado' } });
  });

  it('e-mail inválido e campo extra dão 422', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/admins`;
    const ruim = await cliente(cen.adminA.cookie).post(url, { nome: 'Ana', email: 'x' });
    expect(ruim.status).toBe(422);
    expect(erroPadrao.safeParse(ruim.corpo).success).toBe(true);
    expect(
      (await cliente(cen.adminA.cookie).post(url, { nome: 'Ana', email: emailNovo(), acessaFinanceiro: true })).status,
    ).toBe(422);
  });
});

describe('DELETE /api/grupos/:g/admins/:contaId (workerd)', () => {
  it('A remove A2: 204, auditoria e acesso cortado; a si mesmo e o último admin dão 409', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = (id: string) => `/api/grupos/${cen.grupoA.id}/admins/${id}`;
    const proprio = await cliente(cen.adminA.cookie).delete(url(cen.adminA.id));
    expect(proprio.status).toBe(409);
    expect(proprio.corpo).toMatchObject({ erro: { codigo: 'remover_a_si_mesmo' } });
    expect((await cliente(cen.adminA.cookie).delete(url(cen.adminASemFinanceiro.id))).status).toBe(204);
    const auditorias = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('acao')
      .where('grupo_id', '=', cen.grupoA.id)
      .execute();
    expect(auditorias.map((a) => a.acao)).toEqual(['admin_removido']);
    expect((await cliente(cen.adminASemFinanceiro.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(url(randomUUID()))).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(url('abc'))).status).toBe(404);
    const ultimo = await cliente(cen.adminB.cookie).delete(`/api/grupos/${cen.grupoB.id}/admins/${cen.adminA.id}`);
    expect(ultimo.status).toBe(404);
  });
});

describe('POST /api/grupos/:g/admins/:contaId/redefinir-senha (workerd)', () => {
  it('A redefine A2: senha uma vez, sessões caem, pedido resolvido; a própria conta é recusada', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', '=', cen.adminASemFinanceiro.id).execute();
      await kyselyDe(db).deleteFrom('auditoria').where('entidade_id', '=', cen.adminASemFinanceiro.id).execute();
    });
    await pedidos.registrarOuAtualizar(db, cen.adminASemFinanceiro.id, AGORA);
    const url = `/api/grupos/${cen.grupoA.id}/admins/${cen.adminASemFinanceiro.id}/redefinir-senha`;
    const r = await cliente(cen.adminA.cookie).post(url);
    expect(r.status).toBe(200);
    const exibida = senhaExibida.parse(r.corpo);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect((await cliente(cen.adminASemFinanceiro.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect((await cliente(cen.adminA.cookie).get('/api/sessao/eu')).status).toBe(200);
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === cen.adminASemFinanceiro.id)).toBe(false);
    expect(
      (
        await cliente().post('/api/sessao/entrar', {
          email: cen.adminASemFinanceiro.email,
          senha: exibida.senhaTemporaria,
        })
      ).status,
    ).toBe(204);
    const propria = await cliente(cen.adminA.cookie).post(
      `/api/grupos/${cen.grupoA.id}/admins/${cen.adminA.id}/redefinir-senha`,
    );
    expect(propria.status).toBe(409);
  });

  it('alvo de outro grupo, inexistente e dono dão o mesmo 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const base = `/api/grupos/${cen.grupoA.id}/admins`;
    const alheio = await cliente(cen.adminA.cookie).post(`${base}/${cen.adminB.id}/redefinir-senha`);
    const inexistente = await cliente(cen.adminA.cookie).post(`${base}/${randomUUID()}/redefinir-senha`);
    expect(alheio.status).toBe(404);
    expect(alheio.texto).toBe(inexistente.texto);
    expect((await cliente(cen.adminA.cookie).post(`${base}/abc/redefinir-senha`)).status).toBe(404);
  });
});

describe('PATCH /api/grupos/:g/admins/:contaId/financeiro (workerd)', () => {
  it('A concede e retira de A2 com auditoria; A2 sem financeiro recebe 403', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/admins/${cen.adminASemFinanceiro.id}/financeiro`;
    const concede = await cliente(cen.adminA.cookie).patch(url, { acessaFinanceiro: true });
    expect(concede.status).toBe(200);
    expect(
      listaAdmins.parse(concede.corpo).admins.find((a) => a.contaId === cen.adminASemFinanceiro.id)?.acessaFinanceiro,
    ).toBe(true);
    await cliente(cen.adminA.cookie).patch(url, { acessaFinanceiro: true });
    const retira = await cliente(cen.adminA.cookie).patch(url, { acessaFinanceiro: false });
    expect(
      listaAdmins.parse(retira.corpo).admins.find((a) => a.contaId === cen.adminASemFinanceiro.id)?.acessaFinanceiro,
    ).toBe(false);
    const auditorias = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('acao')
      .where('grupo_id', '=', cen.grupoA.id)
      .orderBy('id')
      .execute();
    expect(auditorias.map((a) => a.acao)).toEqual(['financeiro_concedido', 'financeiro_retirado']);

    const proibido = await cliente(cen.adminASemFinanceiro.cookie).patch(
      `/api/grupos/${cen.grupoA.id}/admins/${cen.adminA.id}/financeiro`,
      { acessaFinanceiro: false },
    );
    expect(proibido.status).toBe(403);
    expect(proibido.corpo).toMatchObject({ erro: { codigo: 'sem_permissao_financeiro' } });
  });

  it('própria permissão 409, alvo de outro grupo 404, corpo inválido 422, sem X-Pelada 403', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const base = `/api/grupos/${cen.grupoA.id}/admins`;
    expect(
      (await cliente(cen.adminA.cookie).patch(`${base}/${cen.adminA.id}/financeiro`, { acessaFinanceiro: false }))
        .status,
    ).toBe(409);
    expect(
      (await cliente(cen.adminA.cookie).patch(`${base}/${cen.adminB.id}/financeiro`, { acessaFinanceiro: true }))
        .status,
    ).toBe(404);
    for (const corpo of [{}, { acessaFinanceiro: 'sim' }, { acessaFinanceiro: true, eDono: true }]) {
      expect(
        (await cliente(cen.adminA.cookie).patch(`${base}/${cen.adminASemFinanceiro.id}/financeiro`, corpo)).status,
      ).toBe(422);
    }
    expect(
      (
        await cliente(cen.adminA.cookie, true).patch(`${base}/${cen.adminASemFinanceiro.id}/financeiro`, {
          acessaFinanceiro: true,
        })
      ).status,
    ).toBe(403);
  });
});
