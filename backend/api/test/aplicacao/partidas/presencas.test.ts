import { describe, expect, it } from 'vitest';
import { MarcacaoInvalida, validarMarcacoes } from '../../../src/aplicacao/partidas/presencas.js';

const ativos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('validarMarcacoes', () => {
  it('ausente não vira linha e a contagem separa presentes, lesionados e expulsos', () => {
    const r = validarMarcacoes(ativos, [
      { jogadorId: 'a', situacao: 'presente' },
      { jogadorId: 'b', situacao: 'lesionado' },
      { jogadorId: 'c', situacao: 'ausente' },
    ]);
    expect(r.linhas).toEqual([
      { jogadorId: 'a', situacao: 'presente' },
      { jogadorId: 'b', situacao: 'lesionado' },
    ]);
    expect(r.contagem).toEqual({ presentes: 1, lesionados: 1, expulsos: 0 });
  });

  it('jogador não marcado é ausente (sem linha); lista vazia é válida', () => {
    expect(validarMarcacoes(ativos, []).linhas).toEqual([]);
  });

  it('reúne todos os problemas: repetido e fora dos ativos (inclusive de outro grupo)', () => {
    let erro: unknown;
    try {
      validarMarcacoes(ativos, [
        { jogadorId: 'a', situacao: 'presente' },
        { jogadorId: 'a', situacao: 'expulso' },
        { jogadorId: 'x', situacao: 'presente' },
      ]);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(MarcacaoInvalida);
    expect((erro as MarcacaoInvalida).problemas).toEqual([
      { indice: 1, jogadorId: 'a', motivo: 'repetido' },
      { indice: 2, jogadorId: 'x', motivo: 'inativo_ou_fora_do_grupo' },
    ]);
  });
});
