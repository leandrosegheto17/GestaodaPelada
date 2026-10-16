import { describe, expect, it } from 'vitest';
import { filtrarJogadores, iniciarMarcacoes, listaParaEnvio, marcarTodos, normalizarBusca } from './marcacoes';

const jogadores = [
  { id: 'j1', apelido: 'Léo Baiano', situacao: 'presente' as const },
  { id: 'j2', apelido: 'Fumaça', situacao: 'ausente' as const },
  { id: 'j3', apelido: 'Marcão', situacao: 'lesionado' as const },
];

describe('marcacoes', () => {
  it('inicia das situações da resposta', () => {
    expect(iniciarMarcacoes(jogadores)).toEqual({ j1: 'presente', j2: 'ausente', j3: 'lesionado' });
  });

  it('marcar todos e limpar valem para a lista inteira', () => {
    const inicial = iniciarMarcacoes(jogadores);
    expect(marcarTodos(inicial, 'presente')).toEqual({ j1: 'presente', j2: 'presente', j3: 'presente' });
    expect(marcarTodos(inicial, 'ausente')).toEqual({ j1: 'ausente', j2: 'ausente', j3: 'ausente' });
  });

  it('a busca ignora caixa e acento e só filtra a exibição', () => {
    expect(filtrarJogadores(jogadores, 'leo').map((j) => j.apelido)).toEqual(['Léo Baiano']);
    expect(filtrarJogadores(jogadores, 'FUMACA').map((j) => j.apelido)).toEqual(['Fumaça']);
    expect(filtrarJogadores(jogadores, '  ')).toHaveLength(3);
    expect(filtrarJogadores(jogadores, 'zzz')).toEqual([]);
    expect(normalizarBusca('  Ação ')).toBe('acao');
  });

  it('o envio leva todas as linhas na ordem da lista, com a situação atual', () => {
    const marcacoes = { ...iniciarMarcacoes(jogadores), j2: 'presente' as const };
    expect(listaParaEnvio(jogadores, marcacoes)).toEqual([
      { jogadorId: 'j1', situacao: 'presente' },
      { jogadorId: 'j2', situacao: 'presente' },
      { jogadorId: 'j3', situacao: 'lesionado' },
    ]);
  });
});
