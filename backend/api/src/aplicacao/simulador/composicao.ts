import { composicaoDois, composicaoVarios, type Escalada } from '@pelada/contrato';

/** Valida o `jsonb` lido do banco com o schema do contrato; forma inválida volta `null`. */
export function lerComposicao(formato: 'dois_times' | 'varios_times', json: unknown): Escalada | null {
  if (formato === 'varios_times') {
    const lida = composicaoVarios.safeParse(json);
    return lida.success ? { formato, composicao: lida.data } : null;
  }
  const lida = composicaoDois.safeParse(json);
  return lida.success ? { formato, composicao: lida.data } : null;
}
