import { ehDataValida, type CampoPeriodo, type RegraPeriodo, type ResultadoAvaliacao } from '@pelada/dominio';
import { MSG_INICIO_NO_FUTURO } from './mensagens.js';

type Recusa = Extract<ResultadoAvaliacao, { ok: false }>;

/** Converte `aaaa-mm-dd` em `dd/mm/aaaa` por corte de texto; data fora do formato lança. */
export function formatarDataBr(iso: string): string {
  if (!ehDataValida(iso)) throw new Error(`Data fora do formato aaaa-mm-dd: ${iso}`);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function limiteDe(recusa: Recusa): string {
  if (recusa.limite === null) throw new Error(`Recusa ${recusa.regra} sem data limite`);
  return formatarDataBr(recusa.limite);
}

function presencaDe(recusa: Recusa): string {
  if (recusa.presenca === undefined) throw new Error('Recusa da regra f sem data da presença');
  return formatarDataBr(recusa.presenca);
}

const TEXTOS: Record<RegraPeriodo, (recusa: Recusa) => string> = {
  a: () => MSG_INICIO_NO_FUTURO,
  b: (x) => `A saída não pode ser antes do início deste período (${limiteDe(x)}).`,
  c: (x) => `O retorno não pode ser antes da saída anterior (${limiteDe(x)}).`,
  d: (x) =>
    x.campo === 'saida'
      ? `A saída não pode ser depois do próximo retorno (${limiteDe(x)}).`
      : `O retorno não pode ser depois da saída deste período (${limiteDe(x)}).`,
  e: () => 'Os períodos não podem se sobrepor.',
  f: (x) =>
    x.campo === 'saida'
      ? `Há presença do jogador em ${presencaDe(x)}. A saída precisa ser em ${limiteDe(x)} ou depois. Para usar uma data anterior, remova a presença em Editar partida.`
      : `Há presença do jogador em ${presencaDe(x)}. O retorno precisa ser em ${limiteDe(x)} ou antes. Para usar uma data posterior, remova a presença em Editar partida.`,
  g: (x) =>
    `A saída do primeiro período não pode ser antes da data de início da pontuação (${limiteDe(x)}). Para ir antes, altere primeiro a data de início.`,
  h: () => 'Informe uma data válida.',
  'nao-corrigivel': (x) =>
    x.campo === 'saida'
      ? 'Este período não tem data de saída.'
      : 'O início do primeiro período é a data de início da pontuação; use Alterar data de início.',
};

/** Campo e texto pt-BR da recusa devolvida por `avaliarPeriodos`. */
export function mensagemDaRecusa(recusa: Recusa): { campo: CampoPeriodo; mensagem: string } {
  return { campo: recusa.campo, mensagem: TEXTOS[recusa.regra](recusa) };
}

/** Recusa do "Alterar data de início" quando o início passaria da saída do primeiro período. */
export function mensagemInicioDepoisDaSaida(limiteIso: string): string {
  return `A data de início não pode ficar depois da saída do primeiro período (${formatarDataBr(limiteIso)}). Corrija antes a data de saída do primeiro período.`;
}
