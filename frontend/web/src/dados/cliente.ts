import { erroPadrao } from '@pelada/contrato';
import { CABECALHO_DO_CACHE } from '../pwa/regras-sw';
import { ErroApi, ErroRede, ErroResposta } from './erros';

/** Qualquer schema do contrato (Zod) serve: só precisamos de `safeParse`. */
export interface Esquema<T> {
  safeParse(dado: unknown): { success: true; data: T } | { success: false };
}

export type MetodoEscrita = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Para respostas 204 (sem corpo). */
export const semCorpo: Esquema<undefined> = { safeParse: () => ({ success: true, data: undefined }) };

function montarUrl(caminho: string): string {
  if (!caminho.startsWith('/') || caminho.startsWith('//')) {
    throw new Error(`Caminho da API inválido: "${caminho}" (deve começar com um único "/").`);
  }
  return new URL('/api' + caminho, location.origin).toString();
}

async function lerJson(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch {
    return undefined;
  }
}

export interface RespostaComMeta<T> {
  dados: T;
  /** `true` quando o service worker respondeu do cache por falta de rede. */
  doCache: boolean;
}

async function enviarComMeta<T>(url: string, init: RequestInit, schema: Esquema<T>): Promise<RespostaComMeta<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { ...init, credentials: 'same-origin' });
  } catch (erro) {
    if (init.signal?.aborted) throw erro;
    throw new ErroRede(erro);
  }
  if (!resposta.ok) {
    const analise = erroPadrao.safeParse(await lerJson(resposta));
    if (analise.success) throw new ErroApi(resposta.status, analise.data);
    throw new ErroResposta(resposta.status, 'erro fora da forma padrão');
  }
  const corpo = resposta.status === 204 ? undefined : await lerJson(resposta);
  const analise = schema.safeParse(corpo);
  if (!analise.success) throw new ErroResposta(resposta.status, 'corpo não confere com o contrato');
  return { dados: analise.data, doCache: resposta.headers.get(CABECALHO_DO_CACHE) === '1' };
}

async function enviar<T>(url: string, init: RequestInit, schema: Esquema<T>): Promise<T> {
  return (await enviarComMeta(url, init, schema)).dados;
}

export function ler<T>(caminho: string, schema: Esquema<T>, opcoes: { signal?: AbortSignal } = {}): Promise<T> {
  const init: RequestInit = { method: 'GET' };
  if (opcoes.signal) init.signal = opcoes.signal;
  return enviar(montarUrl(caminho), init, schema);
}

/** Como `ler`, mas diz se a resposta veio do cache do service worker (sem rede). */
export function lerComMeta<T>(
  caminho: string,
  schema: Esquema<T>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<RespostaComMeta<T>> {
  const init: RequestInit = { method: 'GET' };
  if (opcoes.signal) init.signal = opcoes.signal;
  return enviarComMeta(montarUrl(caminho), init, schema);
}

export function escrever<T>(
  metodo: MetodoEscrita,
  caminho: string,
  corpo: unknown,
  schema: Esquema<T>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<T> {
  const init: RequestInit = { method: metodo, headers: { 'Content-Type': 'application/json', 'X-Pelada': '1' } };
  if (corpo !== undefined) init.body = JSON.stringify(corpo);
  if (opcoes.signal) init.signal = opcoes.signal;
  return enviar(montarUrl(caminho), init, schema);
}
