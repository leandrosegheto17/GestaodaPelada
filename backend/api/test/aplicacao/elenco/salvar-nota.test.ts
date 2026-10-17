import { describe, expect, it } from 'vitest';
import { salvarNota } from '../../../src/aplicacao/elenco/salvar-nota.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('salvarNota', () => {
  it('troca uma nota e devolve o nível recalculado pela regra do domínio', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const jogador = await criarJogador(db, g, cen.adminA.id);
    const ids: string[] = [];
    for (const nome of ['Visão', 'Passe', 'Físico', 'Drible', 'Chute', 'Desarme'])
      ids.push(await habilidades.criar(db, g, nome));
    const notas = [8, 7, 6, 7, 8, 5];
    for (const [i, id] of ids.entries()) await habilidades.gravarNota(db, g, jogador, id, notas[i]!);

    // 8, 7, 6, 7, 9, 5 → média 7,0
    expect(await salvarNota(db, g, jogador, ids[4]!, 9)).toEqual({
      habilidadeId: ids[4],
      nota: 9,
      nivel: 7,
      semNota: false,
    });
  });

  it('apagar a única nota volta ao nível sem nota; apagar nota que não existe não é erro', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const jogador = await criarJogador(db, g, cen.adminA.id);
    const passe = await habilidades.criar(db, g, 'Passe');
    expect(await salvarNota(db, g, jogador, passe, 7)).toMatchObject({ nivel: 7, semNota: false });
    expect(await salvarNota(db, g, jogador, passe, null)).toEqual({
      habilidadeId: passe,
      nota: null,
      nivel: 5.5,
      semNota: true,
    });
    expect(await salvarNota(db, g, jogador, passe, null)).toMatchObject({ semNota: true });
  });

  it('habilidade ou jogador de outro grupo: null e nada gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const jogadorA = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    const habilidadeA = await habilidades.criar(db, cen.grupoA.id, 'Passe');
    const habilidadeB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    const jogadorB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    expect(await salvarNota(db, cen.grupoA.id, jogadorA, habilidadeB, 5)).toBeNull();
    expect(await salvarNota(db, cen.grupoA.id, jogadorB, habilidadeA, 5)).toBeNull();
    expect(await habilidades.notasDoGrupo(db, cen.grupoA.id)).toEqual([]);
    expect(await habilidades.notasDoGrupo(db, cen.grupoB.id)).toEqual([]);
  });

  it('jogador inativo também recebe nota', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const jogador = await criarJogador(db, g, cen.adminA.id);
    const passe = await habilidades.criar(db, g, 'Passe');
    const DEPOIS_DE_TODO_INICIO = '2100-01-01';
    expect(await jogadores.inativar(db, g, jogador, DEPOIS_DE_TODO_INICIO)).toBe('ok');
    expect(await salvarNota(db, g, jogador, passe, 6)).toMatchObject({ nota: 6, nivel: 6, semNota: false });
  });
});
