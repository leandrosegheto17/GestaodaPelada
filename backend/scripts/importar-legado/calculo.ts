import { acumuladoComInicial, somarDias, type ConfigPesos, type Pesos, type SituacaoPresenca } from '@pelada/dominio';
import type { Posicao } from '@pelada/contrato';
import {
  chaveDe,
  ErroLegado,
  type AtivoLido,
  type CadastroLido,
  type LinhaClassificacao,
  type PontuacoesLidas,
  type RodadaLida,
  type ValorDeRodada,
} from './tipos.ts';

/** Pesos do legado (RN-24): vigentes desde a primeira rodada, também no passado; exceção só deste script. */
export const PESOS_LEGADO: Readonly<Pesos> = {
  presencaSemChuva: 3,
  presencaComChuva: 6,
  lesionadoSemChuva: 3,
  lesionadoComChuva: 6,
  expulsoSemChuva: 2,
  expulsoComChuva: 5,
};
export const VIGENCIA_LEGADO = '2022-04-03';

/** Preenchimento do Gestor para inativos sem cadastro completo; o admin corrige ao reativar. */
export const ANO_DE_INATIVO = 1970;
export const POSICAO_DE_INATIVO: Posicao = 'meia';

export interface JogadorPlano {
  apelido: string;
  ativo: boolean;
  anoNascimento: number;
  posicao: Posicao;
  pontuacaoInicial: number;
  entrada: string;
  /** Dia seguinte à última rodada com número; só inativos. */
  saida: string | null;
  /** Seis notas; só ativos. */
  notas: number[] | null;
}

export interface PartidaPlano {
  data: string;
  choveu: boolean;
  presencas: { apelido: string; situacao: Exclude<SituacaoPresenca, 'lesionado'> }[];
  /** Há valores simples e em dobro na mesma rodada. */
  mista: boolean;
}

export interface Conferencia {
  apelido: string;
  calculado: number;
  atual: number;
  ajustes: number;
  /** `atual - calculado`. */
  diferenca: number;
  /** A diferença é exatamente o ajuste manual do legado. */
  confere: boolean;
}

export interface PlanoImportacao {
  jogadores: JogadorPlano[];
  partidas: PartidaPlano[];
  conferencia: Conferencia[];
  /** Jogadores com "sem registro" entre a primeira e a última rodada com número. */
  comLacuna: number;
}

const ehChuva = (valor: ValorDeRodada): boolean => valor === 5 || valor === 6;

/**
 * A partida tem chuva quando a maioria dos valores é em dobro (6 ou 5). Uma rodada com valores simples e em
 * dobro juntos (`mista`) não cabe no modelo do app, onde a chuva vale para a partida inteira: quem destoa da
 * maioria aparece como divergência na conferência, nunca é ajustado em silêncio.
 */
function chuvaDaRodada(rodada: RodadaLida): { choveu: boolean; mista: boolean } {
  const valores = [...rodada.valores.values()].filter((v) => v.valor !== null && v.valor !== 0);
  const dobros = valores.filter((v) => ehChuva(v.valor)).length;
  const simples = valores.length - dobros;
  return { choveu: dobros > simples, mista: dobros > 0 && simples > 0 };
}

function situacaoDe(valor: ValorDeRodada): 'presente' | 'expulso' | null {
  if (valor === 3 || valor === 6) return 'presente';
  if (valor === 2 || valor === 5) return 'expulso';
  return null;
}

function conferirElenco(classificacao: readonly LinhaClassificacao[], cadastro: CadastroLido): void {
  const chaves = new Set<string>();
  for (const c of classificacao) {
    const chave = chaveDe(c.apelido);
    if (chaves.has(chave)) throw new ErroLegado('atleta repetido na classificação.', c.linha);
    chaves.add(chave);
  }
  const ativos = new Set(cadastro.ativos.map((a) => chaveDe(a.apelido)));
  const inativos = new Set(cadastro.inativos.map(chaveDe));
  for (const c of classificacao) {
    const chave = chaveDe(c.apelido);
    const noCadastro = c.situacao === 'ativo' ? ativos : inativos;
    if (!noCadastro.has(chave)) throw new ErroLegado('atleta sem cadastro com a mesma situação.', c.linha);
  }
  if (ativos.size + inativos.size !== classificacao.length) {
    throw new ErroLegado('o cadastro tem atletas que não estão na classificação.');
  }
}

function conferirRodadas(rodadas: readonly RodadaLida[], classificacao: readonly LinhaClassificacao[]): void {
  const conhecidos = new Set(classificacao.map((c) => chaveDe(c.apelido)));
  for (const rodada of rodadas) {
    for (const [chave, { linha }] of rodada.valores) {
      if (!conhecidos.has(chave)) throw new ErroLegado('atleta da rodada fora da classificação.', linha);
    }
  }
}

/** Números do atleta ao longo das rodadas, na ordem das datas. */
function serieDe(chave: string, rodadas: readonly RodadaLida[]): ValorDeRodada[] {
  return rodadas.map((r) => r.valores.get(chave)?.valor ?? null);
}

function periodoDe(
  c: LinhaClassificacao,
  serie: readonly ValorDeRodada[],
  rodadas: readonly RodadaLida[],
  hoje: string,
) {
  const primeira = serie.findIndex((v) => v !== null);
  const ultima = serie.length - 1 - [...serie].reverse().findIndex((v) => v !== null);
  if (primeira < 0) {
    if (c.situacao === 'inativo') throw new ErroLegado('inativo sem nenhuma rodada.', c.linha);
    return { entrada: hoje, saida: null, lacuna: false };
  }
  const entrada = rodadas[primeira]!.data;
  const lacuna = serie.slice(primeira, ultima + 1).some((v) => v === null);
  return { entrada, saida: c.situacao === 'inativo' ? somarDias(rodadas[ultima]!.data, 1) : null, lacuna };
}

function jogadorDe(c: LinhaClassificacao, cadastro: CadastroLido, periodo: { entrada: string; saida: string | null }) {
  const ativo = c.situacao === 'ativo';
  const doCadastro: AtivoLido | undefined = ativo
    ? cadastro.ativos.find((a) => chaveDe(a.apelido) === chaveDe(c.apelido))
    : undefined;
  return {
    apelido: c.apelido,
    ativo,
    anoNascimento: doCadastro?.anoNascimento ?? ANO_DE_INATIVO,
    posicao: doCadastro?.posicao ?? POSICAO_DE_INATIVO,
    pontuacaoInicial: c.inicial,
    entrada: periodo.entrada,
    saida: periodo.saida,
    notas: doCadastro?.notas ?? null,
  } satisfies JogadorPlano;
}

/**
 * Plano completo da importação a partir dos dois arquivos já lidos: jogadores, partidas, presenças e a
 * conferência de cada total contra o "Atual" do legado. Não toca em banco; o dry-run para aqui.
 */
export function calcularPlano(lidas: PontuacoesLidas, cadastro: CadastroLido, hoje: string): PlanoImportacao {
  conferirElenco(lidas.classificacao, cadastro);
  conferirRodadas(lidas.rodadas, lidas.classificacao);

  const partidas = lidas.rodadas.map((r): PartidaPlano => {
    const presencas = [...r.valores.values()].flatMap(({ apelido, valor }) => {
      const situacao = situacaoDe(valor);
      return situacao ? [{ apelido, situacao }] : [];
    });
    return { data: r.data, ...chuvaDaRodada(r), presencas };
  });
  const choveuEm = new Map(partidas.map((p) => [p.data, p.choveu]));
  const config: ConfigPesos = {
    ...PESOS_LEGADO,
    vigenteDesde: VIGENCIA_LEGADO,
    registradoEm: `${VIGENCIA_LEGADO}T00:00:00Z`,
  };
  if (lidas.rodadas[0] && lidas.rodadas[0].data < VIGENCIA_LEGADO) {
    throw new ErroLegado('há rodada anterior à vigência dos pesos do legado.');
  }

  let comLacuna = 0;
  const jogadores: JogadorPlano[] = [];
  const conferencia: Conferencia[] = [];
  for (const c of lidas.classificacao) {
    const chave = chaveDe(c.apelido);
    const serie = serieDe(chave, lidas.rodadas);
    const periodo = periodoDe(c, serie, lidas.rodadas, hoje);
    if (periodo.lacuna) comLacuna++;
    jogadores.push(jogadorDe(c, cadastro, periodo));
    const presencas = lidas.rodadas.flatMap((r, i) => {
      const situacao = situacaoDe(serie[i] ?? null);
      return situacao ? [{ data: r.data, choveu: choveuEm.get(r.data) ?? false, situacao }] : [];
    });
    const calculado = acumuladoComInicial(c.inicial, presencas, [config], hoje);
    conferencia.push({
      apelido: c.apelido,
      calculado,
      atual: c.atual,
      ajustes: c.ajustes,
      diferenca: c.atual - calculado,
      confere: c.atual - calculado === c.ajustes,
    });
  }
  return { jogadores, partidas, conferencia, comLacuna };
}
