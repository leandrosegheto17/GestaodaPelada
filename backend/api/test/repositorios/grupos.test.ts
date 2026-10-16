import { describe, expect, it } from 'vitest';
import * as grupos from '../../src/infraestrutura/db/repositorios/grupos.js';
import { SlugEmUso } from '../../src/infraestrutura/db/repositorios/grupos.js';
import * as vinculos from '../../src/infraestrutura/db/repositorios/vinculos.js';
import { VinculoDuplicado } from '../../src/infraestrutura/db/repositorios/vinculos.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../apoio/fabricas/grupos.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb();
const agora = new Date(relogioFixo('2026-10-16').agoraIso());

describe('repositório de grupos', () => {
  it('não encontra grupo de outro id e não altera o grupo B ao mexer no A', async () => {
    const db = await abrir();
    const a = await criarGrupo(db, fabrica, { nome: 'Grupo A' });
    const b = await criarGrupo(db, fabrica, { nome: 'Grupo B' });
    expect(await grupos.buscarPorId(db, '00000000-0000-0000-0000-000000000000')).toBeNull();
    await grupos.atualizarDados(db, a.id, {
      nome: 'A novo',
      diaSemana: 'sexta',
      frequencia: 'mensal',
      horario: '19:30',
    });
    const depoisB = await grupos.buscarPorId(db, b.id);
    expect(depoisB).toMatchObject({ nome: 'Grupo B', diaSemana: 'quinta', horario: '20:00' });
    expect(await grupos.arquivar(db, '00000000-0000-0000-0000-000000000000', agora)).toBe(false);
  });

  it('busca por slug inclui arquivado; arquivar e reativar', async () => {
    const db = await abrir();
    const g = await criarGrupo(db, fabrica);
    expect((await grupos.buscarPorSlug(db, g.slug))?.arquivadoEm).toBeNull();
    expect(await grupos.arquivar(db, g.id, agora)).toBe(true);
    expect((await grupos.buscarPorSlug(db, g.slug))?.arquivadoEm).toEqual(agora);
    expect(await grupos.reativar(db, g.id)).toBe(true);
    expect((await grupos.buscarPorId(db, g.id))?.arquivadoEm).toBeNull();
  });

  it('slugsComBase traz a base e os sufixos, mas não nomes parecidos', async () => {
    const db = await abrir();
    const base = `base-${Date.now().toString(36)}`;
    await criarGrupo(db, fabrica, { slug: base });
    await criarGrupo(db, fabrica, { slug: `${base}-2` });
    await criarGrupo(db, fabrica, { slug: `${base}ao` });
    expect((await grupos.slugsComBase(db, base)).sort()).toEqual([base, `${base}-2`].sort());
  });

  it('slug repetido vira SlugEmUso', async () => {
    const db = await abrir();
    const g = await criarGrupo(db, fabrica);
    await expect(criarGrupo(db, fabrica, { slug: g.slug, criadoPor: g.criadoPor })).rejects.toBeInstanceOf(SlugEmUso);
  });

  it('atualizarDados mantém o slug; horário e trial voltam como texto', async () => {
    const db = await abrir();
    const g = await criarGrupo(db, fabrica);
    await grupos.atualizarDados(db, g.id, {
      nome: 'Outro nome',
      diaSemana: 'sabado',
      frequencia: 'quinzenal',
      horario: '09:05',
    });
    await grupos.alterarSituacao(db, g.id, { situacao: 'trial', trialInicio: '2026-10-01' });
    const trial = await grupos.buscarPorId(db, g.id);
    expect(trial).toMatchObject({ slug: g.slug, nome: 'Outro nome', horario: '09:05', trialInicio: '2026-10-01' });
    await grupos.alterarSituacao(db, g.id, { situacao: 'ativo', trialInicio: null });
    expect(await grupos.buscarPorId(db, g.id)).toMatchObject({ situacaoComercial: 'ativo', trialInicio: null });
  });

  it('listarTodosComAdmins traz os nomes dos admins em ordem', async () => {
    const db = await abrir();
    const g = await criarGrupo(db, fabrica);
    const zeca = await criarConta(db, fabrica, { nome: 'Zeca' });
    const ana = await criarConta(db, fabrica, { nome: 'Ana' });
    await vincularAdmin(db, g.id, zeca.id);
    await vincularAdmin(db, g.id, ana.id);
    const todos = await grupos.listarTodosComAdmins(db);
    expect(todos.find((x) => x.id === g.id)?.admins).toEqual(['Ana', 'Zeca']);
  });
});

describe('repositório de vínculos', () => {
  it('isola por grupo: vínculo de A não vale em B', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const a = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    const b = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    await vincularAdmin(db, a.id, conta.id, { acessaFinanceiro: true });
    expect(await vinculos.buscar(db, a.id, conta.id)).toEqual({ acessaFinanceiro: true, grupoArquivado: false });
    expect(await vinculos.buscar(db, b.id, conta.id)).toBeNull();
    expect(await vinculos.remover(db, b.id, conta.id)).toBe(false);
    expect(await vinculos.alterarAcessaFinanceiro(db, b.id, conta.id, false)).toBe(false);
    expect((await vinculos.buscar(db, a.id, conta.id))?.acessaFinanceiro).toBe(true);
  });

  it('duplicado vira VinculoDuplicado; alterar e remover funcionam', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const g = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    await vincularAdmin(db, g.id, conta.id);
    await expect(vincularAdmin(db, g.id, conta.id)).rejects.toBeInstanceOf(VinculoDuplicado);
    expect(await vinculos.alterarAcessaFinanceiro(db, g.id, conta.id, true)).toBe(true);
    expect((await vinculos.adminsDoGrupo(db, g.id))[0]).toMatchObject({ contaId: conta.id, acessaFinanceiro: true });
    expect(await vinculos.contarAdmins(db, g.id)).toBe(1);
    expect(await vinculos.remover(db, g.id, conta.id)).toBe(true);
    expect(await vinculos.contarAdmins(db, g.id)).toBe(0);
  });

  it('gruposDaConta só lista não arquivados, por nome', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const b = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Beta' });
    const a = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Alfa' });
    const c = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Arquivado' });
    for (const g of [a, b, c]) await vincularAdmin(db, g.id, conta.id);
    await grupos.arquivar(db, c.id, agora);
    const lista = await vinculos.gruposDaConta(db, conta.id);
    expect(lista.map((g) => g.nome)).toEqual(['Alfa', 'Beta']);
    expect(lista[0]?.horario).toBe('20:00');
    expect((await vinculos.buscar(db, c.id, conta.id))?.grupoArquivado).toBe(true);
  });
});
