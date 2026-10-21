import {
  inicioEfetivo,
  type ConfigPesos,
  type JogadorDoRanking,
  type PartidaDoRanking,
  type PresencaDoRanking,
  type SituacaoPresenca,
} from '@pelada/dominio';
import type { Jogador } from '../../infraestrutura/db/repositorios/jogadores.js';
import type { ConfigPesosHistorico } from '../../infraestrutura/db/repositorios/pesos.js';

/**
 * Jogador anonimizado não tem ano de nascimento: vai para o fim do desempate (o domínio ordena
 * pelo menor ano primeiro).
 */
const ANO_SEM_INFORMACAO = 9999;

/** Monta o jogador do domínio campo a campo: telefone e demais colunas nunca chegam ao domínio. */
export function paraJogadorDominio(linha: Jogador): JogadorDoRanking {
  return {
    id: linha.id,
    apelido: linha.apelido,
    anoNascimento: linha.anoNascimento ?? ANO_SEM_INFORMACAO,
    periodos: linha.periodos.map((p) => ({ inicio: p.inicio, fim: p.fim })),
    pontuacaoInicial: linha.pontuacaoInicial,
    inicioPontuacao: inicioEfetivo(linha),
  };
}

export function paraPartidaDominio(linha: { id: string; data: string; choveu: boolean }): PartidaDoRanking {
  return { id: linha.id, data: linha.data, choveu: linha.choveu };
}

function paraSituacao(valor: string): SituacaoPresenca {
  switch (valor) {
    case 'presente':
    case 'lesionado':
    case 'expulso':
      return valor;
    default:
      throw new Error('Situação de presença desconhecida.');
  }
}

export function paraPresencaDominio(linha: {
  partidaId: string;
  jogadorId: string;
  situacao: string;
}): PresencaDoRanking {
  return { partidaId: linha.partidaId, jogadorId: linha.jogadorId, situacao: paraSituacao(linha.situacao) };
}

export function paraConfigPesosDominio(linha: ConfigPesosHistorico): ConfigPesos {
  return {
    vigenteDesde: linha.vigenteDesde,
    registradoEm: linha.registradoEm.toISOString(),
    presencaSemChuva: linha.presencaSemChuva,
    presencaComChuva: linha.presencaComChuva,
    lesionadoSemChuva: linha.lesionadoSemChuva,
    lesionadoComChuva: linha.lesionadoComChuva,
    expulsoSemChuva: linha.expulsoSemChuva,
    expulsoComChuva: linha.expulsoComChuva,
  };
}
