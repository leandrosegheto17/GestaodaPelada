import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { erroPadrao, grupoDetalhe } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../../../src/entrada/app.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });
const AGORA = new Date('2026-10-16T12:00:00Z');
const ok = { nome: 'Racha da Sexta', diaSemana: 'sexta', frequencia: 'quinzenal', horario: '19:30' };

describe('PATCH /api/grupos/:grupoId (workerd)', () => {
  it('muda os quatro campos, mantém o slug e a data sugerida segue o dia novo', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const antes = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}`);
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${cen.grupoA.id}`, ok);
    expect(r.status).toBe(200);
    const depois = grupoDetalhe.parse(r.corpo);
    expect(depois.grupo).toMatchObject(ok);
    expect(depois.grupo.slug).toBe((antes.corpo as { grupo: { slug: string } }).grupo.slug);
    expect(depois.grupo.urlPublica).toBe((antes.corpo as { grupo: { urlPublica: string } }).grupo.urlPublica);
    expect(depois.inicio.dataSugeridaPartida).toBe('2026-10-16');
  });

  it.each([
    [{ ...ok, nome: 'ab' }, 'nome'],
    [{ ...ok, nome: 'a'.repeat(61) }, 'nome'],
    [{ ...ok, horario: '24:00' }, 'horario'],
    [{ ...ok, horario: '9:00' }, 'horario'],
    [{ ...ok, diaSemana: 'feriado' }, 'diaSemana'],
    [{ ...ok, frequencia: 'diaria' }, 'frequencia'],
    [{ nome: 'Racha', diaSemana: 'sexta', frequencia: 'semanal' }, 'horario'],
    [{ ...ok, slug: 'outro-slug' }, 'corpo'],
  ])('422 apontando o campo: %j', async (corpo, campo) => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${cen.grupoA.id}`, corpo);
    expect(r.status).toBe(422);
    expect(erroPadrao.safeParse(r.corpo).success).toBe(true);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toContain(campo);
  });

  it('nomes de 3 e 60 caracteres são aceitos; admin de outro grupo recebe 404 e nada muda', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    for (const n of [3, 60]) {
      expect(
        (await cliente(cen.adminA.cookie).patch(`/api/grupos/${cen.grupoA.id}`, { ...ok, nome: 'a'.repeat(n) })).status,
      ).toBe(200);
    }
    expect((await cliente(cen.adminB.cookie).patch(`/api/grupos/${cen.grupoA.id}`, ok)).status).toBe(404);
    const depois = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}`);
    expect((depois.corpo as { grupo: { nome: string } }).grupo.nome).toBe('a'.repeat(60));
  });

  it('o banco guarda os quatro campos e o histórico (partida e pesos) fica intacto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, { data: '2026-10-15', choveu: true, presencas: [], autor: cen.adminA.id, agora: AGORA }),
    );
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-02-05',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    const foto = async () => ({
      partidas: await kyselyDe(db)
        .selectFrom('partidas')
        .select(['id', 'data', 'choveu'])
        .where('grupo_id', '=', g)
        .execute(),
      pesos: await kyselyDe(db).selectFrom('config_pesos').selectAll().where('grupo_id', '=', g).execute(),
    });
    const antes = await foto();
    expect((await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}`, ok)).status).toBe(200);
    expect(await foto()).toEqual(antes);
    const linha = await kyselyDe(db)
      .selectFrom('grupos')
      .select(['nome', 'dia_semana', 'frequencia', 'horario'])
      .where('id', '=', g)
      .executeTakeFirstOrThrow();
    expect(linha).toMatchObject({ nome: ok.nome, dia_semana: ok.diaSemana, frequencia: ok.frequencia });
    expect(String(linha.horario).slice(0, 5)).toBe(ok.horario);
  });

  it('sem X-Pelada: 403 e nada muda; corpo não JSON: 422', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/grupos/${cen.grupoA.id}`;
    const sem = clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie: cen.adminA.cookie, semCsrf: true });
    expect((await sem.patch(url, ok)).status).toBe(403);
    const ctx = createExecutionContext();
    const resp = await criarApp({ relogio: relogioFixo('2026-10-22') }).fetch(
      new Request(`http://app.invalid${url}`, {
        method: 'PATCH',
        headers: { 'X-Pelada': '1', Cookie: cen.adminA.cookie, 'Content-Type': 'application/json' },
        body: '{nao-json',
      }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(resp.status).toBe(422);
    const depois = await cliente(cen.adminA.cookie).get(url);
    expect((depois.corpo as { grupo: { nome: string } }).grupo.nome).toBe('Grupo A');
  });
});
