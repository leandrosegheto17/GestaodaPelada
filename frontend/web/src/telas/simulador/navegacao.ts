import { entradaSimulador, type EntradaSimulador } from '@pelada/contrato';

/** Entrada que uma tela do simulador deixou no `state` da navegação (validada; qualquer outra coisa vira `null`). */
export function entradaDoEstado(state: unknown): EntradaSimulador | null {
  const bruto = typeof state === 'object' && state !== null && 'entrada' in state ? state.entrada : undefined;
  const analise = entradaSimulador.safeParse(bruto);
  return analise.success ? analise.data : null;
}

/** Texto de erro que a tela de resultado deixa para a T12 quando não consegue sugerir. */
export function erroDoEstado(state: unknown): string | null {
  return typeof state === 'object' && state !== null && 'erro' in state && typeof state.erro === 'string'
    ? state.erro
    : null;
}
