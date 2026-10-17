import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../../src/entrada/app.js';
import { montarCenario, type Cenario } from '../apoio/cenario-acesso.js';
import { contarLinhasPorTabela, usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { CASOS } from './casos.js';
import { listarRotas } from './rotas.js';
import { verificarCaso } from './verificar.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const rotas = listarRotas(criarApp());

describe('cobertura da suíte de isolamento (G-04)', () => {
  it('a lista de rotas não é vazia e inclui a verificação de saúde', () => {
    expect(rotas).toContain('GET /api/saude');
  });
  it('toda rota registrada tem um caso', () => {
    const semCaso = rotas.filter((r) => !(r in CASOS));
    expect(semCaso, `rotas sem caso em test/isolamento/casos.ts: ${semCaso.join(', ')}`).toEqual([]);
  });
  it('todo caso aponta para uma rota que existe', () => {
    const orfaos = Object.keys(CASOS).filter((c) => !rotas.includes(c));
    expect(orfaos, `casos órfãos: ${orfaos.join(', ')}`).toEqual([]);
  });
  it('caso "não se aplica" tem justificativa', () => {
    for (const [chave, caso] of Object.entries(CASOS)) {
      if (caso.tipo === 'nao_se_aplica') expect(caso.justificativa.trim(), chave).not.toBe('');
    }
  });
});

describe('isolamento entre grupos (G-03)', () => {
  let antes: Record<string, number> = {};
  beforeAll(async () => {
    antes = await contarLinhasPorTabela();
  });
  afterAll(async () => {
    expect(await contarLinhasPorTabela(), 'a suíte deixou linhas no banco compartilhado').toEqual(antes);
  });

  let cenario: Cenario | null = null;
  const cenarioAtual = async (): Promise<Cenario> => {
    cenario = await montarCenario(await abrir(), fabrica);
    return cenario;
  };

  it.each(Object.entries(CASOS))('%s', async (chave, caso) => {
    await verificarCaso(chave, caso, await cenarioAtual());
    expect(cenario).not.toBeNull();
  });
});
