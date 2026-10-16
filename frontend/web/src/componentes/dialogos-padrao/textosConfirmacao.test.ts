import { describe, expect, it } from 'vitest';
import * as t from './textosConfirmacao';

describe('textos da confirmação destrutiva (D2)', () => {
  it('excluir partida', () => {
    expect(t.excluirPartida('2026-10-15')).toEqual({
      titulo: 'Excluir a partida de 15/10?',
      texto: 'As presenças dessa partida saem do ranking, e os pontos de todos são recalculados.',
      verbo: 'Excluir partida',
    });
  });

  it('refazer sugestão', () => {
    expect(t.refazerSugestao()).toEqual({
      titulo: 'Descartar seus ajustes?',
      texto: 'A sugestão será refeita do zero com as mesmas entradas.',
      verbo: 'Refazer sugestão',
    });
  });

  it('excluir habilidade', () => {
    expect(t.excluirHabilidade('Drible')).toEqual({
      titulo: 'Excluir “Drible”?',
      texto: 'Excluir “Drible” apaga as notas de todos os jogadores nessa habilidade.',
      verbo: 'Excluir habilidade',
    });
  });

  it('remover admin', () => {
    expect(t.removerAdmin('Marquinhos')).toEqual({
      titulo: 'Remover Marquinhos do grupo?',
      texto: 'Ele perde o acesso a este grupo na hora.',
      verbo: 'Remover do grupo',
    });
  });

  it('desmarcar pagamento', () => {
    expect(t.desmarcarPagamento('Toninho', '2026-10', 7500)).toEqual({
      titulo: 'Desmarcar o pagamento de Toninho?',
      texto: 'A entrada “Mensalidade Toninho 10/2026” (R$ 75,00) será removida do caixa.',
      verbo: 'Desmarcar',
    });
  });

  it('excluir lançamento', () => {
    expect(t.excluirLancamento('Aluguel da quadra outubro', 80000)).toEqual({
      titulo: 'Excluir lançamento?',
      texto: '“Aluguel da quadra outubro” (R$ 800,00) sai do caixa.',
      verbo: 'Excluir lançamento',
    });
  });

  it('arquivar grupo', () => {
    expect(t.arquivarGrupo('Pelada de Quinta')).toEqual({
      titulo: 'Arquivar “Pelada de Quinta”?',
      texto:
        'Os admins perdem o acesso e o link mostra “Grupo indisponível”. Os dados ficam guardados e o grupo pode ser reativado.',
      verbo: 'Arquivar grupo',
    });
  });
});
