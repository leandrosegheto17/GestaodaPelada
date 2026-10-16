import { grupoCriado } from '@pelada/contrato';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-16'), cookie });
const unico = () => randomBytes(4).toString('hex');

describe('POST /api/dono/grupos (workerd)', () => {
  it('conta nova: 201 com a senha temporária e no-store; vínculo de conta existente: sem senha', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const nome = `Racha Rota ${unico()}`;
    const corpo = {
      nome,
      diaSemana: 'sabado',
      frequencia: 'semanal',
      horario: '10:00',
      adminNome: 'Rodrigo',
      adminEmail: `rodrigo-${unico()}@teste.invalid`,
    };
    const r = await cliente(cen.dono.cookie).post('/api/dono/grupos', corpo);
    expect(r.status).toBe(201);
    const criado = grupoCriado.parse(r.corpo);
    fabrica.registrar(async () => {
      const banco = kyselyDe(db);
      for (const tabela of ['config_pesos', 'habilidades', 'auditoria', 'vinculos_admin'] as const) {
        await banco.deleteFrom(tabela).where('grupo_id', '=', criado.grupo.id).execute();
      }
      await banco.deleteFrom('grupos').where('id', '=', criado.grupo.id).execute();
      await banco.deleteFrom('auditoria').where('entidade_id', '=', criado.primeiroAdmin.contaId).execute();
      await banco.deleteFrom('contas').where('id', '=', criado.primeiroAdmin.contaId).execute();
    });
    expect(criado.primeiroAdmin.contaNova).toBe(true);
    expect(r.headers.get('Cache-Control')).toBe('no-store');

    const vinculo = await cliente(cen.dono.cookie).post('/api/dono/grupos', {
      ...corpo,
      nome: `${nome} Dois`,
      adminEmail: cen.adminB.email,
    });
    expect(vinculo.status).toBe(201);
    const segundo = grupoCriado.parse(vinculo.corpo);
    fabrica.registrar(async () => {
      const banco = kyselyDe(db);
      for (const tabela of ['config_pesos', 'habilidades', 'auditoria', 'vinculos_admin'] as const) {
        await banco.deleteFrom(tabela).where('grupo_id', '=', segundo.grupo.id).execute();
      }
      await banco.deleteFrom('grupos').where('id', '=', segundo.grupo.id).execute();
    });
    expect(segundo.primeiroAdmin).toMatchObject({ contaNova: false, senhaTemporaria: null });
  });

  it('campo faltando: 422 apontando o campo; admin comum: 404 e nada criado', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const invalido = await cliente(cen.dono.cookie).post('/api/dono/grupos', {
      nome: 'ab',
      diaSemana: 'sabado',
      frequencia: 'semanal',
      horario: '',
      adminNome: 'Rodrigo',
      adminEmail: 'x',
    });
    expect(invalido.status).toBe(422);
    expect(Object.keys((invalido.corpo as { erro: { campos: object } }).erro.campos).sort()).toEqual(
      ['adminEmail', 'horario', 'nome'].sort(),
    );
    expect((await cliente(cen.adminA.cookie).post('/api/dono/grupos', {})).status).toBe(404);
  });
});
