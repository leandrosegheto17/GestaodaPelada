import { adminAdicionado, erroPadrao } from '@pelada/contrato';
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });
const sufixo = () => randomBytes(4).toString('hex');
const emailNovo = () => `novo-${sufixo()}@teste.invalid`;
const url = (grupoId: string) => `/api/grupos/${grupoId}/admins`;

afterEach(() => vi.restoreAllMocks());

/** Registra a limpeza da conta criada pela rota (e do que pende dela). */
function limparConta(db: Awaited<ReturnType<typeof abrir>>, contaId: string): void {
  fabrica.registrar(async () => {
    const banco = kyselyDe(db);
    await banco.deleteFrom('auditoria').where('entidade_id', '=', contaId).execute();
    await banco.deleteFrom('vinculos_admin').where('conta_id', '=', contaId).execute();
    await banco.deleteFrom('sessoes').where('conta_id', '=', contaId).execute();
    await banco.deleteFrom('contas').where('id', '=', contaId).execute();
  });
}

describe('POST /api/grupos/:g/admins (workerd)', () => {
  it('e-mail novo: 201 com senha de 12 caracteres, no-store, sem financeiro e escopo de troca de senha', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const email = emailNovo();
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome: 'Rodrigo', email });
    expect(r.status).toBe(201);
    const criado = adminAdicionado.parse(r.corpo);
    if (criado.contaNova) limparConta(db, criado.contaId);
    expect(criado.contaNova).toBe(true);
    expect(criado.senhaTemporaria).toHaveLength(12);
    expect(criado.nome).toBe('Rodrigo');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const vinculo = await kyselyDe(db)
      .selectFrom('vinculos_admin')
      .select('acessa_financeiro')
      .where('conta_id', '=', criado.contaId)
      .where('grupo_id', '=', cen.grupoA.id)
      .executeTakeFirst();
    expect(vinculo?.acessa_financeiro).toBe(false);
    const entrada = await cliente().post('/api/sessao/entrar', { email, senha: criado.senhaTemporaria });
    expect(entrada.status).toBe(204);
    const cookie = (entrada.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const eu = await cliente(cookie).get(url(cen.grupoA.id));
    expect(eu.status).toBe(403);
  });

  it('e-mail de admin de outro grupo (caixa/espaços): 201 só com vínculo, senha antiga intacta', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), {
      nome: 'Outro Nome',
      email: ` ${cen.adminB.email.toUpperCase()} `,
    });
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ contaId: cen.adminB.id, contaNova: false, senhaTemporaria: null });
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const entrada = await cliente().post('/api/sessao/entrar', { email: cen.adminB.email, senha: cen.adminB.senha });
    expect(entrada.status).toBe(204);
  });

  it('vínculo repetido: 409 admin_ja_vinculado e nada gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const contar = async () =>
      (
        await kyselyDe(db)
          .selectFrom('vinculos_admin')
          .select('conta_id')
          .where('grupo_id', '=', cen.grupoA.id)
          .execute()
      ).length;
    const antes = await contar();
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome: 'Admin A', email: cen.adminA.email });
    expect(r.status).toBe(409);
    expect(r.corpo).toEqual({
      erro: { codigo: 'admin_ja_vinculado', mensagem: 'Esse e-mail já é admin deste grupo.' },
    });
    expect(await contar()).toBe(antes);
  });

  it('e-mail inválido: 422 com o corpo de erro-validacao-admin', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome: 'Ana', email: 'x' });
    expect(r.status).toBe(422);
    expect(r.corpo).toEqual({
      erro: {
        codigo: 'validacao',
        mensagem: 'Corrija os campos indicados.',
        campos: { email: 'Informe um e-mail válido.' },
      },
    });
  });

  it.each([
    ['nome com 1', { nome: 'A', email: 'a@teste.invalid' }],
    ['nome com 61', { nome: 'a'.repeat(61), email: 'a@teste.invalid' }],
    [
      'e-mail com 255',
      { nome: 'Ana', email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com` },
    ],
    ['campo extra acessaFinanceiro', { nome: 'Ana', email: 'a@teste.invalid', acessaFinanceiro: true }],
    ['campo extra eDono', { nome: 'Ana', email: 'a@teste.invalid', eDono: true }],
    ['sem nome', { email: 'a@teste.invalid' }],
  ])('%s: 422 sem criar nada', async (_nome, corpo) => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), corpo);
    expect(r.status).toBe(422);
    expect(erroPadrao.safeParse(r.corpo).success).toBe(true);
  });

  it.each([
    ['nome com 2', 'Al'],
    ['nome com 60', 'a'.repeat(60)],
  ])('%s é aceito', async (_rotulo, nome) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome, email: emailNovo() });
    expect(r.status).toBe(201);
    limparConta(db, adminAdicionado.parse(r.corpo).contaId);
  });

  it('e-mail com 254 caracteres é aceito', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const email = `${sufixo()}${'a'.repeat(56)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
    expect(email).toHaveLength(254);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome: 'Ana', email });
    expect(r.status).toBe(201);
    limparConta(db, adminAdicionado.parse(r.corpo).contaId);
  });

  it('corpo vazio ou que não é JSON: 422', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const vazio = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id));
    expect(vazio.status).toBe(422);
    const lixo = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), 'não é json{');
    expect(lixo.status).toBe(422);
  });

  it('sem X-Pelada: 403; admin de outro grupo: 404 e nada criado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const corpo = { nome: 'Ana', email: emailNovo() };
    expect((await cliente(cen.adminA.cookie, true).post(url(cen.grupoA.id), corpo)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).post(url(cen.grupoA.id), corpo)).status).toBe(404);
    const criada = await kyselyDe(db)
      .selectFrom('contas')
      .select('id')
      .where('email', '=', corpo.email)
      .executeTakeFirst();
    expect(criada).toBeUndefined();
  });

  it('a senha devolvida não aparece em console.*', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { nome: 'Ana', email: emailNovo() });
    const criado = adminAdicionado.parse(r.corpo);
    limparConta(db, criado.contaId);
    const senha = criado.senhaTemporaria ?? '';
    expect(senha).not.toBe('');
    const saida = JSON.stringify(espioes.flatMap((e) => e.mock.calls));
    expect(saida).not.toContain(senha);
  });
});
