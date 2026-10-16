import { eventoPublicoCorpo } from '@pelada/contrato';
import { idAnonimo } from '../pwa/armazenamento';
import { escrever, semCorpo } from './cliente';

const aberturasRegistradas = new Set<string>();

async function enviarAbertura(slug: string): Promise<void> {
  const corpo = eventoPublicoCorpo.safeParse({ tipo: 'ranking_aberto', dispositivoId: await idAnonimo() });
  if (!corpo.success) return;
  await escrever('POST', `/publico/${encodeURIComponent(slug)}/eventos`, corpo.data, semCorpo);
}

/**
 * Registra que o ranking foi aberto (RF-57): no máximo um envio por grupo a cada carregamento da
 * página, sem repetir ao trocar de mês nem no duplo efeito do StrictMode. Falha de envio é ignorada.
 */
export function registrarAbertura(slug: string): void {
  if (aberturasRegistradas.has(slug)) return;
  aberturasRegistradas.add(slug);
  void enviarAbertura(slug).catch(() => undefined);
}

/** Só para testes: esquece as aberturas já registradas. */
export function reiniciarAberturas(): void {
  aberturasRegistradas.clear();
}
