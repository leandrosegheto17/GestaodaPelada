/** Formato da escalação: 2 times com 1º e 2º tempo, ou 3 ou mais times. */
export type FormatoEscalacao = 'dois_times' | 'varios_times';

export interface EntradaPrevia {
  formato: FormatoEscalacao;
  /** Jogadores por time (já validado pelo contrato: 2 a 11). */
  n: number;
  /** Quantidade de aptos (não a lista). */
  aptos: number;
}

export interface ComposicaoVarios {
  /** Total de times, contando o incompleto. */
  times: number;
  timesCompletos: number;
  tamanhoTime: number;
  /** Tamanho do time que sobrou; 0 = não há time incompleto. */
  tamanhoIncompleto: number;
}

/** T = teto(aptos ÷ N): `times` completos de N e, se sobrar gente, um incompleto. Só inteiros. */
export function composicaoVarios(aptos: number, n: number): ComposicaoVarios {
  const timesCompletos = Math.floor(aptos / n);
  const tamanhoIncompleto = aptos % n;
  return {
    times: timesCompletos + (tamanhoIncompleto > 0 ? 1 : 0),
    timesCompletos,
    tamanhoTime: n,
    tamanhoIncompleto,
  };
}

export type Previa =
  | { formato: 'dois_times'; valida: true; times: 2; reservas: number }
  | { formato: 'dois_times'; valida: false; motivo: 'aptos_insuficientes'; maiorNPossivel: number | null }
  | ({ formato: 'varios_times'; valida: true } & ComposicaoVarios)
  | {
      formato: 'varios_times';
      valida: false;
      motivo: 'aptos_insuficientes';
      /** Maior N (≥ 2) que ainda forma 3 times; `null` se nenhum serve. */
      nSugerido: number | null;
      /** Com aptos suficientes para 2 times de 2, o formato "2 times" é uma saída. */
      doisTimesPossivel: boolean;
    };

const N_MINIMO = 2;

/**
 * Prévia do simulador: quantos times saem e por que não saem. Dois times pedem aptos ≥ 2N;
 * três ou mais pedem aptos > 2N (I-38). O texto mostrado na tela é montado fora do domínio.
 */
export function calcularPrevia({ formato, n, aptos }: EntradaPrevia): Previa {
  if (formato === 'dois_times') {
    if (aptos >= 2 * n) return { formato, valida: true, times: 2, reservas: aptos - 2 * n };
    const maior = Math.floor(aptos / 2);
    return {
      formato,
      valida: false,
      motivo: 'aptos_insuficientes',
      maiorNPossivel: maior >= N_MINIMO ? maior : null,
    };
  }
  if (aptos > 2 * n) return { formato, valida: true, ...composicaoVarios(aptos, n) };
  const sugerido = Math.floor((aptos - 1) / 2);
  return {
    formato,
    valida: false,
    motivo: 'aptos_insuficientes',
    nSugerido: sugerido >= N_MINIMO ? sugerido : null,
    doisTimesPossivel: aptos >= 2 * N_MINIMO,
  };
}
