import { diaMes, formatarMoeda, mesNumerico } from '../../formatacao';

export interface TextoConfirmacao {
  titulo: string;
  texto: string;
  verbo: string;
}

/** Textos dos diálogos de confirmação destrutiva (tabela D2 da UX-SPEC), um por linha. */

export function excluirPartida(data: string): TextoConfirmacao {
  return {
    titulo: `Excluir a partida de ${diaMes(data)}?`,
    texto: 'As presenças dessa partida saem do ranking, e os pontos de todos são recalculados.',
    verbo: 'Excluir partida',
  };
}

export function refazerSugestao(): TextoConfirmacao {
  return {
    titulo: 'Descartar seus ajustes?',
    texto: 'A sugestão será refeita do zero com as mesmas entradas.',
    verbo: 'Refazer sugestão',
  };
}

export function excluirHabilidade(nome: string): TextoConfirmacao {
  return {
    titulo: `Excluir “${nome}”?`,
    texto: `Excluir “${nome}” apaga as notas de todos os jogadores nessa habilidade.`,
    verbo: 'Excluir habilidade',
  };
}

export function removerAdmin(nome: string): TextoConfirmacao {
  return {
    titulo: `Remover ${nome} do grupo?`,
    texto: 'Ele perde o acesso a este grupo na hora.',
    verbo: 'Remover do grupo',
  };
}

export function desmarcarPagamento(apelido: string, mes: string, valorCentavos: number): TextoConfirmacao {
  return {
    titulo: `Desmarcar o pagamento de ${apelido}?`,
    texto: `A entrada “Mensalidade ${apelido} ${mesNumerico(mes)}” (${formatarMoeda(valorCentavos)}) será removida do caixa.`,
    verbo: 'Desmarcar',
  };
}

export function excluirLancamento(descricao: string, valorCentavos: number): TextoConfirmacao {
  return {
    titulo: 'Excluir lançamento?',
    texto: `“${descricao}” (${formatarMoeda(valorCentavos)}) sai do caixa.`,
    verbo: 'Excluir lançamento',
  };
}

export function arquivarGrupo(nome: string): TextoConfirmacao {
  return {
    titulo: `Arquivar “${nome}”?`,
    texto:
      'Os admins perdem o acesso e o link mostra “Grupo indisponível”. Os dados ficam guardados e o grupo pode ser reativado.',
    verbo: 'Arquivar grupo',
  };
}
