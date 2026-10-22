import { compararDatas, ehDataValida, type Data } from '../datas/datas.js';
import type { Periodo } from './atividade.js';
import { coberturaRetirada } from './cobertura-periodos.js';
import { descreverPeriodos, type PeriodoComId } from './periodos-corrigiveis.js';
import { validarPeriodos } from './validar-periodos.js';

export type Operacao =
  | { tipo: 'corrigir'; periodoId: string; saida?: Data; retorno?: Data }
  | { tipo: 'reativar'; dataRetorno: Data }
  | { tipo: 'inativar'; dataSaida: Data };

export interface EntradaAvaliacao {
  periodos: readonly PeriodoComId[];
  operacao: Operacao;
  /** Dia de hoje, vindo de fora: o domínio não lê relógio. */
  hoje: Data;
  inicioPontuacao: Data;
  /** Datas de partida com presença, lesão ou expulsão do jogador. */
  datasComPresenca: readonly Data[];
}

export type RegraPeriodo = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'nao-corrigivel';
export type CampoPeriodo = 'saida' | 'retorno' | 'dataRetorno';

export type ResultadoAvaliacao =
  | { ok: true; periodos: Array<Periodo & { id?: string }>; alterado: boolean }
  | { ok: false; regra: RegraPeriodo; campo: CampoPeriodo; limite: Data | null; presenca?: Data };

type Recusa = Extract<ResultadoAvaliacao, { ok: false }>;
type Campos = { saida?: Data; retorno?: Data };
type Contexto = Pick<EntradaAvaliacao, 'hoje' | 'inicioPontuacao' | 'datasComPresenca'>;

const recusa = (regra: RegraPeriodo, campo: CampoPeriodo, limite: Data | null, presenca?: Data): Recusa =>
  presenca === undefined ? { ok: false, regra, campo, limite } : { ok: false, regra, campo, limite, presenca };

const emOrdem = (periodos: readonly PeriodoComId[]): PeriodoComId[] =>
  periodos.map((p) => ({ ...p })).sort((a, b) => compararDatas(a.inicio, b.inicio));

const CAMPOS: ReadonlyArray<'saida' | 'retorno'> = ['saida', 'retorno'];

/** Regras (h) e (a) para cada data informada, na ordem saída, retorno. */
function formatoEFuturo(informados: ReadonlyArray<[CampoPeriodo, unknown]>, hoje: Data): Recusa | null {
  for (const [campo, valor] of informados) {
    if (!ehDataValida(valor)) return recusa('h', campo, null);
  }
  for (const [campo, valor] of informados) {
    if (compararDatas(valor as Data, hoje) > 0) return recusa('a', campo, hoje);
  }
  return null;
}

/** Regra (e), via `validarPeriodos`. */
function sobreposicao(periodos: readonly Periodo[], campo: CampoPeriodo): Recusa | null {
  const r = validarPeriodos(periodos);
  if (r.ok) return null;
  return recusa(r.erro === 'saida-antes-da-entrada' ? 'b' : 'e', campo, null);
}

/** Regra (f): presença que a mudança tira dos períodos. Saída tem prioridade sobre retorno. */
function presencaRetirada(
  antes: readonly Periodo[],
  depois: readonly Periodo[],
  alvo: Periodo,
  campos: Campos,
  datas: readonly Data[],
): Recusa | null {
  const { retiradas, limiteSaida, limiteRetorno } = coberturaRetirada({ antes, depois, datasComPresenca: datas });
  if (retiradas.length === 0) return null;
  const noRetorno = retiradas.filter((d) => compararDatas(d, alvo.inicio) < 0);
  const naSaida = retiradas.filter((d) => compararDatas(d, alvo.inicio) >= 0);
  if (naSaida.length > 0 && campos.saida !== undefined) {
    return recusa('f', 'saida', limiteSaida, naSaida[naSaida.length - 1]);
  }
  if (noRetorno.length > 0) return recusa('f', 'retorno', limiteRetorno, noRetorno[0]);
  return recusa('f', 'saida', limiteSaida, retiradas[retiradas.length - 1]);
}

/** Regras (b) a (g) sobre uma edição de saída e/ou retorno de um período já existente. */
function avaliarEdicao(
  ordenados: PeriodoComId[],
  indice: number,
  campos: Campos,
  contexto: Contexto,
): ResultadoAvaliacao {
  const atual = ordenados[indice]!;
  const descricao = descreverPeriodos(ordenados)[indice]!;
  const novo: PeriodoComId = {
    ...atual,
    inicio: campos.retorno ?? atual.inicio,
    fim: campos.saida ?? atual.fim,
  };
  if (campos.saida !== undefined && compararDatas(campos.saida, novo.inicio) < 0) {
    return recusa('b', 'saida', novo.inicio);
  }
  if (
    campos.retorno !== undefined &&
    descricao.saidaAnterior !== null &&
    compararDatas(campos.retorno, descricao.saidaAnterior) < 0
  ) {
    return recusa('c', 'retorno', descricao.saidaAnterior);
  }
  if (
    campos.saida !== undefined &&
    descricao.inicioDoProximo !== null &&
    compararDatas(campos.saida, descricao.inicioDoProximo) > 0
  ) {
    return recusa('d', 'saida', descricao.inicioDoProximo);
  }
  if (campos.retorno !== undefined && novo.fim !== null && compararDatas(campos.retorno, novo.fim) > 0) {
    return recusa('d', 'retorno', novo.fim);
  }
  const depois = ordenados.map((p, i) => (i === indice ? novo : p));
  const sobrepoe = sobreposicao(depois, campos.saida !== undefined ? 'saida' : 'retorno');
  if (sobrepoe) return sobrepoe;
  const perdeu = presencaRetirada(ordenados, depois, novo, campos, contexto.datasComPresenca);
  if (perdeu) return perdeu;
  if (indice === 0 && campos.saida !== undefined && compararDatas(campos.saida, contexto.inicioPontuacao) < 0) {
    return recusa('g', 'saida', contexto.inicioPontuacao);
  }
  return { ok: true, periodos: depois, alterado: true };
}

function corrigir(ordenados: PeriodoComId[], operacao: Extract<Operacao, { tipo: 'corrigir' }>, contexto: Contexto) {
  const campos: Campos = {};
  const informados: Array<[CampoPeriodo, unknown]> = [];
  for (const campo of CAMPOS) {
    if (operacao[campo] !== undefined) {
      informados.push([campo, operacao[campo]]);
      campos[campo] = operacao[campo];
    }
  }
  const invalida = formatoEFuturo(informados, contexto.hoje);
  const indice = ordenados.findIndex((p) => p.id === operacao.periodoId);
  const alvo = indice < 0 ? null : descreverPeriodos(ordenados)[indice]!;
  if (informados.length === 0 && alvo === null) return recusa('nao-corrigivel', 'saida', null);
  if (invalida?.regra === 'h') return invalida;
  for (const [campo] of informados) {
    const permitido = alvo?.corrigivel[campo as 'saida' | 'retorno'] === true;
    if (!permitido) return recusa('nao-corrigivel', campo, null);
  }
  if (invalida) return invalida;
  const atual = ordenados[indice];
  const igual =
    atual !== undefined &&
    (campos.saida === undefined || campos.saida === atual.fim) &&
    (campos.retorno === undefined || campos.retorno === atual.inicio);
  if (igual) return { ok: true as const, periodos: ordenados, alterado: false };
  return avaliarEdicao(ordenados, indice, campos, contexto);
}

function reativar(ordenados: PeriodoComId[], dataRetorno: Data, contexto: Contexto): ResultadoAvaliacao {
  const invalida = formatoEFuturo([['dataRetorno', dataRetorno]], contexto.hoje);
  if (invalida) return invalida;
  const ultimo = ordenados[ordenados.length - 1];
  if (ultimo?.fim != null && compararDatas(dataRetorno, ultimo.fim) < 0) {
    return recusa('c', 'dataRetorno', ultimo.fim);
  }
  const depois = [...ordenados, { inicio: dataRetorno, fim: null }];
  return sobreposicao(depois, 'dataRetorno') ?? { ok: true, periodos: depois, alterado: true };
}

function inativar(ordenados: PeriodoComId[], dataSaida: Data, contexto: Contexto): ResultadoAvaliacao {
  const invalida = formatoEFuturo([['saida', dataSaida]], contexto.hoje);
  if (invalida?.regra === 'h') return invalida;
  const indice = ordenados.findIndex((p) => p.fim === null);
  if (indice < 0) return recusa('nao-corrigivel', 'saida', null);
  return invalida ?? avaliarEdicao(ordenados, indice, { saida: dataSaida }, contexto);
}

/**
 * Validação única de corrigir datas, reativar com retorno retroativo e inativar com saída
 * (RF-79). Devolve só a primeira regra que falha, na ordem (h), campo não corrigível,
 * (a) a (g). Não altera a entrada nem lê relógio.
 */
export function avaliarPeriodos(entrada: EntradaAvaliacao): ResultadoAvaliacao {
  const { operacao, ...contexto } = entrada;
  const ordenados = emOrdem(entrada.periodos);
  switch (operacao.tipo) {
    case 'corrigir':
      return corrigir(ordenados, operacao, contexto);
    case 'reativar':
      return reativar(ordenados, operacao.dataRetorno, contexto);
    case 'inativar':
      return inativar(ordenados, operacao.dataSaida, contexto);
  }
}
