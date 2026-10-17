import { grupoCriado } from '@pelada/contrato';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import modeloNovoAdmin from '../../../../../.md/mockup/respostas/dono-grupo-criado-novo-admin.json';
import modeloVinculo from '../../../../../.md/mockup/respostas/dono-grupo-criado-vinculo.json';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-16'), cookie });
const unico = () => randomBytes(4).toString('hex');

const corpoValido = (nome: string) => ({
  nome,
  diaSemana: 'sabado',
  frequencia: 'semanal',
  horario: '10:00',
  adminNome: 'Rodrigo',
  adminEmail: `rodrigo-${unico()}@teste.invalid`,
});

const gruposComNome = (db: Awaited<ReturnType<typeof abrir>>, nome: string) =>
  kyselyDe(db).selectFrom('grupos').select('id').where('nome', '=', nome).execute();

/** Caminho de cada chave com o tipo do valor (arrays fundidos em `[]`). */
function formaDe(no: unknown, caminho = '', mapa: Record<string, string> = {}): Record<string, string> {
  if (no && typeof no === 'object' && !Array.isArray(no)) {
    for (const [k, v] of Object.entries(no)) formaDe(v, `${caminho}.${k}`, mapa);
  } else {
    mapa[caminho] = no === null ? 'null' : typeof no;
  }
  return mapa;
}

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

  it('422 com slug e eDono extras (campos estritos); nada é criado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const nome = `Extra ${unico()}`;
    for (const extra of [{ slug: 'meu-slug' }, { eDono: true }]) {
      const r = await cliente(cen.dono.cookie).post('/api/dono/grupos', { ...corpoValido(nome), ...extra });
      expect(r.status).toBe(422);
    }
    expect(await gruposComNome(db, nome)).toEqual([]);
  });

  it('sem X-Pelada: 403; sem sessão: 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const nome = `Sem Acesso ${unico()}`;
    const semCsrf = await clienteTeste({
      relogio: relogioFixo('2026-10-16'),
      cookie: cen.dono.cookie,
      semCsrf: true,
    }).post('/api/dono/grupos', corpoValido(nome));
    expect(semCsrf.status).toBe(403);
    const semSessao = await clienteTeste({ relogio: relogioFixo('2026-10-16') }).post(
      '/api/dono/grupos',
      corpoValido(nome),
    );
    expect(semSessao.status).toBe(401);
    expect(await gruposComNome(db, nome)).toEqual([]);
  });

  it('forma igual a dono-grupo-criado-*.json; vínculo existente mantém o hash da senha', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const nome = `Forma ${unico()}`;
    const hashDe = async () =>
      await kyselyDe(db).selectFrom('contas').select('senha_hash').where('id', '=', cen.adminB.id).execute();
    const hashAntes = await hashDe();
    const novo = await cliente(cen.dono.cookie).post('/api/dono/grupos', corpoValido(nome));
    const vinculo = await cliente(cen.dono.cookie).post('/api/dono/grupos', {
      ...corpoValido(`${nome} Dois`),
      adminEmail: cen.adminB.email,
    });
    expect([novo.status, vinculo.status]).toEqual([201, 201]);
    const criados = [grupoCriado.parse(novo.corpo), grupoCriado.parse(vinculo.corpo)];
    fabrica.registrar(async () => {
      const banco = kyselyDe(db);
      for (const criado of criados) {
        for (const tabela of ['config_pesos', 'habilidades', 'auditoria', 'vinculos_admin'] as const) {
          await banco.deleteFrom(tabela).where('grupo_id', '=', criado.grupo.id).execute();
        }
        await banco.deleteFrom('grupos').where('id', '=', criado.grupo.id).execute();
      }
      await banco.deleteFrom('auditoria').where('entidade_id', '=', criados[0]!.primeiroAdmin.contaId).execute();
      await banco.deleteFrom('contas').where('id', '=', criados[0]!.primeiroAdmin.contaId).execute();
    });
    expect(formaDe(novo.corpo)).toEqual(formaDe(modeloNovoAdmin));
    expect(formaDe(vinculo.corpo)).toEqual(formaDe(modeloVinculo));
    expect(await hashDe()).toEqual(hashAntes);
    const vinculos = await kyselyDe(db)
      .selectFrom('vinculos_admin')
      .select('conta_id')
      .where('grupo_id', '=', criados[1]!.grupo.id)
      .execute();
    expect(vinculos).toEqual([{ conta_id: cen.adminB.id }]);
  });
});
