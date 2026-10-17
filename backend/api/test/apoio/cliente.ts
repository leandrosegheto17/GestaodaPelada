import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { criarApp } from '../../src/entrada/app.js';
import type { Limitador } from '../../src/entrada/middlewares/limite-taxa.js';
import type { Relogio } from '../../src/infraestrutura/relogio/index.js';

export interface OpcoesCliente {
  relogio?: Relogio;
  /** Não envia `X-Pelada: 1` (para testar o 403). */
  semCsrf?: boolean;
  cookie?: string;
  /** Limitadores de taxa; por padrão nenhum limita (os testes fazem muitas chamadas seguidas). */
  limitadores?: { entrar?: Limitador; publico?: Limitador };
  /** Cabeçalhos extras em toda requisição (ex.: `CF-Connecting-IP`). */
  cabecalhos?: Record<string, string>;
  /** Substitui os bindings do worker (ex.: espiar o acesso ao Hyperdrive). */
  env?: typeof env;
}

export interface RespostaTeste {
  status: number;
  headers: Headers;
  corpo: unknown;
  texto: string;
}

function lerJson(texto: string): unknown {
  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

/** Cliente que usa o app completo (middlewares inclusos) dentro do workerd. */
export function clienteTeste(opcoes: OpcoesCliente = {}) {
  const semLimite: Limitador = { limit: async () => ({ success: true }) };
  const app = criarApp({
    ...(opcoes.relogio ? { relogio: opcoes.relogio } : {}),
    limitadores: { entrar: opcoes.limitadores?.entrar ?? semLimite, publico: opcoes.limitadores?.publico ?? semLimite },
  });

  async function enviar(metodo: string, caminho: string, corpo?: unknown): Promise<RespostaTeste> {
    const cabecalhos = new Headers();
    if (!opcoes.semCsrf) cabecalhos.set('X-Pelada', '1');
    if (opcoes.cookie) cabecalhos.set('Cookie', opcoes.cookie);
    for (const [nome, valor] of Object.entries(opcoes.cabecalhos ?? {})) cabecalhos.set(nome, valor);
    if (corpo !== undefined) cabecalhos.set('Content-Type', 'application/json');
    const ctx = createExecutionContext();
    const pedido = new Request(`http://app.invalid${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });
    const resposta = await app.fetch(pedido, opcoes.env ?? env, ctx);
    await waitOnExecutionContext(ctx);
    const texto = await resposta.text();
    return { status: resposta.status, headers: resposta.headers, corpo: lerJson(texto), texto };
  }

  return {
    app,
    get: (caminho: string) => enviar('GET', caminho),
    post: (caminho: string, corpo?: unknown) => enviar('POST', caminho, corpo),
    put: (caminho: string, corpo?: unknown) => enviar('PUT', caminho, corpo),
    patch: (caminho: string, corpo?: unknown) => enviar('PATCH', caminho, corpo),
    delete: (caminho: string) => enviar('DELETE', caminho),
  };
}
