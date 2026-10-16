import { data as esquemaData } from '@pelada/contrato';

export type TipoRetorno = 'partida-salva' | 'partida-excluida' | 'escalacao-confirmada';

/** Recado que uma tela deixa para a tela de início depois de salvar ou confirmar algo. */
export interface Retorno {
  tipo: TipoRetorno;
  data: string;
}

const TIPOS: readonly string[] = ['partida-salva', 'partida-excluida', 'escalacao-confirmada'];

/** Valor para `navigate(destino, { state })`. Vai no estado da navegação, não na URL: recarregar não repete a faixa. */
export function estadoRetorno(retorno: Retorno): { retorno: Retorno } {
  return { retorno };
}

/** Lê o `location.state` com validação; qualquer coisa estranha vira `null`. */
export function lerRetorno(estado: unknown): Retorno | null {
  if (typeof estado !== 'object' || estado === null || !('retorno' in estado)) return null;
  const { retorno } = estado;
  if (typeof retorno !== 'object' || retorno === null || !('tipo' in retorno) || !('data' in retorno)) return null;
  const { tipo, data } = retorno;
  if (typeof tipo !== 'string' || !TIPOS.includes(tipo) || !esquemaData.safeParse(data).success) return null;
  return { tipo: tipo as TipoRetorno, data: data as string };
}
