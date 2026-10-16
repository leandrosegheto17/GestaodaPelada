import { entradaSimulador } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL,
  estadoDeEntrada,
  idsMarcados,
  paraEntrada,
  paraPrevia,
  reduzir,
  type Acao,
  type EstadoEntradas,
} from './estadoEntradas';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ID);
const aplicar = (...acoes: Acao[]): EstadoEntradas => acoes.reduce(reduzir, ESTADO_INICIAL);

describe('reduzir', () => {
  it('N fica preso entre 2 e 11 e K entre 0 e 20', () => {
    expect(aplicar({ tipo: 'n', n: 1 }).n).toBe(2);
    expect(aplicar({ tipo: 'n', n: 12 }).n).toBe(11);
    expect(aplicar({ tipo: 'k', k: -1 }).k).toBe(0);
    expect(aplicar({ tipo: 'k', k: 21 }).k).toBe(20);
  });

  it('desmarcar um apto desliga o "só 1º tempo" dele', () => {
    const estado = aplicar(
      { tipo: 'so1oTempo', id: TODOS[0]!, valor: true },
      { tipo: 'marcar', id: TODOS[0]!, marcado: false, todos: TODOS },
    );
    expect(estado.so1oTempo.has(TODOS[0]!)).toBe(false);
    expect(idsMarcados(estado, TODOS)).toEqual(TODOS.slice(1));
  });

  it('marcar e desmarcar todos', () => {
    const nenhum = aplicar({ tipo: 'desmarcarTodos' });
    expect(idsMarcados(nenhum, TODOS)).toEqual([]);
    expect(idsMarcados(reduzir(nenhum, { tipo: 'marcarTodos', todos: TODOS }), TODOS)).toEqual(TODOS);
  });

  it('ids que saíram da lista (troca de data) deixam de contar', () => {
    const estado = aplicar({ tipo: 'marcarTodos', todos: TODOS });
    expect(idsMarcados(estado, TODOS.slice(0, 3))).toEqual(TODOS.slice(0, 3));
    expect(idsMarcados(ESTADO_INICIAL, TODOS.slice(0, 3))).toEqual(TODOS.slice(0, 3));
  });
});

describe('paraEntrada', () => {
  it('dois times: leva K (ou "ilimitado") e "só 1º tempo"; passa no schema', () => {
    const estado = aplicar({ tipo: 'so1oTempo', id: TODOS[2]!, valor: true });
    const entrada = paraEntrada(estado, TODOS, '2026-10-22');
    expect(entrada).toMatchObject({ formato: 'dois_times', n: 7, k: 2 });
    expect(entrada?.aptos[2]).toEqual({ id: TODOS[2], so1oTempo: true });
    const ilimitado = paraEntrada(reduzir(estado, { tipo: 'ilimitado', ilimitado: true }), TODOS, '2026-10-22');
    expect(ilimitado).toMatchObject({ k: 'ilimitado' });
    expect(entradaSimulador.safeParse(ilimitado).success).toBe(true);
  });

  it('vários times: sem K nem "só 1º tempo", mesmo com eles marcados antes', () => {
    const estado = aplicar(
      { tipo: 'so1oTempo', id: TODOS[0]!, valor: true },
      { tipo: 'formato', formato: 'varios_times' },
    );
    const entrada = paraEntrada(estado, TODOS, '2026-10-22');
    expect(entrada).not.toHaveProperty('k');
    expect(entrada?.aptos[0]).toEqual({ id: TODOS[0] });
    expect(entrada && 'k' in paraPrevia(entrada)).toBe(false);
  });

  it('sem nenhum apto marcado não há entrada', () => {
    expect(paraEntrada(aplicar({ tipo: 'desmarcarTodos' }), TODOS, '2026-10-22')).toBeNull();
  });

  it('a prévia não leva a data', () => {
    const entrada = paraEntrada(ESTADO_INICIAL, TODOS, '2026-10-22');
    expect(entrada && paraPrevia(entrada)).not.toHaveProperty('data');
  });
});

describe('estadoDeEntrada', () => {
  it('reabre o formulário com a entrada usada', () => {
    const entrada = paraEntrada(
      aplicar(
        { tipo: 'ilimitado', ilimitado: true },
        { tipo: 'so1oTempo', id: TODOS[1]!, valor: true },
        { tipo: 'n', n: 9 },
      ),
      TODOS,
      '2026-10-29',
    );
    if (!entrada) throw new Error('entrada esperada');
    const estado = estadoDeEntrada(entrada);
    expect(estado).toMatchObject({ data: '2026-10-29', formato: 'dois_times', n: 9, ilimitado: true });
    expect([...estado.so1oTempo]).toEqual([TODOS[1]]);
    expect(paraEntrada(estado, TODOS, '2026-10-29')).toEqual(entrada);
  });
});
