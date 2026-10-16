import { habilidade } from '@pelada/contrato';
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
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

const ERRO_EM_USO = {
  erro: {
    codigo: 'validacao',
    mensagem: 'Corrija os campos indicados.',
    campos: { nome: 'Já existe uma habilidade com esse nome.' },
  },
};

describe('PATCH /api/grupos/:g/habilidades/:id (workerd)', () => {
  it('200 com a habilidade; a nota do jogador continua com o mesmo id e valor', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await habilidades.criar(db, g, 'Passe');
    const jogador = await criarJogador(db, g, cen.adminA.id);
    await habilidades.gravarNota(db, g, jogador, id, 8);

    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/habilidades/${id}`, { nome: 'Passe longo' });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(habilidade.parse(r.corpo)).toEqual({ id, nome: 'Passe longo' });
    const notas = await habilidades.notasDoJogador(db, g, jogador);
    expect(notas).toEqual([{ habilidadeId: id, habilidade: 'Passe longo', nota: 8 }]);
  });

  it('mudar só a caixa do próprio nome é permitido; nome de outra habilidade dá 422 do mockup', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const passe = await habilidades.criar(db, g, 'Passe');
    await habilidades.criar(db, g, 'Chute');
    const url = `/api/grupos/${g}/habilidades/${passe}`;
    expect((await cliente(cen.adminA.cookie).patch(url, { nome: 'passe' })).status).toBe(200);
    const r = await cliente(cen.adminA.cookie).patch(url, { nome: 'CHUTE' });
    expect(r.status).toBe(422);
    expect(r.corpo).toEqual(ERRO_EM_USO);
  });

  it.each([
    ['A', 422],
    ['AB', 200],
    ['x'.repeat(30), 200],
    ['x'.repeat(31), 422],
  ])('nome %j → %i', async (nome, status) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await habilidades.criar(db, cen.grupoA.id, 'Passe');
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${cen.grupoA.id}/habilidades/${id}`, { nome });
    expect(r.status).toBe(status);
  });

  it('inexistente e id malformado: 404; sem X-Pelada 403; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await habilidades.criar(db, g, 'Passe');
    const inexistente = '00000000-0000-4000-8000-000000000000';
    expect(
      (await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/habilidades/${inexistente}`, { nome: 'Novo' })).status,
    ).toBe(404);
    expect(
      (await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/habilidades/nao-e-uuid`, { nome: 'Novo' })).status,
    ).toBe(404);
    expect(
      (await cliente(cen.adminA.cookie, true).patch(`/api/grupos/${g}/habilidades/${id}`, { nome: 'Novo' })).status,
    ).toBe(403);
    expect((await cliente().patch(`/api/grupos/${g}/habilidades/${id}`, { nome: 'Novo' })).status).toBe(401);
  });

  it('habilidade de B pedida em A: 404 e o nome em B fica intacto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${cen.grupoA.id}/habilidades/${doB}`, {
      nome: 'Invasor',
    });
    expect(r.status).toBe(404);
    expect((await habilidades.listar(db, cen.grupoB.id)).map((h) => h.nome)).toEqual(['Drible']);
  });
});
