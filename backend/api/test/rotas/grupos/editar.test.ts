import { erroPadrao, grupoDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });
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
});
