import { describe, expect, it } from 'vitest';
import { criarHabilidade, renomearHabilidade } from '../../../src/aplicacao/elenco/habilidades.js';
import { MSG_HABILIDADE_EM_USO } from '../../../src/aplicacao/elenco/mensagens.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

describe('renomearHabilidade (workerd)', () => {
  it('renomeia; nome de outra do grupo vira erro do campo; habilidade de outro grupo é null', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const passe = await habilidades.criar(db, cen.grupoA.id, 'Passe');
    await habilidades.criar(db, cen.grupoA.id, 'Chute');
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    expect(await renomearHabilidade(db, cen.grupoA.id, passe, 'Passe longo')).toEqual({
      ok: true,
      habilidade: { id: passe, nome: 'Passe longo' },
    });
    expect(await renomearHabilidade(db, cen.grupoA.id, passe, 'CHUTE')).toEqual({
      ok: false,
      campos: { nome: MSG_HABILIDADE_EM_USO },
    });
    expect(await renomearHabilidade(db, cen.grupoA.id, doB, 'Invasor')).toBeNull();
  });
});

describe('criarHabilidade (workerd)', () => {
  it('cria e devolve o id', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await criarHabilidade(db, cen.grupoA.id, 'Passe');
    expect(r.ok && r.habilidade.nome).toBe('Passe');
    expect(await habilidades.listar(db, cen.grupoA.id)).toHaveLength(1);
  });

  it('nome repetido sem distinguir caixa vira erro do campo nome; em outro grupo é permitido', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await criarHabilidade(db, cen.grupoA.id, 'Passe');
    const repetido = await criarHabilidade(db, cen.grupoA.id, 'passe');
    expect(repetido).toEqual({ ok: false, campos: { nome: MSG_HABILIDADE_EM_USO } });
    expect((await criarHabilidade(db, cen.grupoB.id, 'passe')).ok).toBe(true);
  });
});
