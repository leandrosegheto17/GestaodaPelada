import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { criarApp } from '../../src/entrada/app.js';
import type { Relogio } from '../../src/infraestrutura/relogio/index.js';

export interface OpcoesCliente {
  relogio?: Relogio;
  /** Não envia `X-Pelada: 1` (para testar o 403). */
  semCsrf?: boolean;
  cookie?: string;
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
  const app = criarApp(opcoes.relogio ? { relogio: opcoes.relogio } : {});

  async function enviar(metodo: string, caminho: string, corpo?: unknown): Promise<RespostaTeste> {
    const cabecalhos = new Headers();
    if (!opcoes.semCsrf) cabecalhos.set('X-Pelada', '1');
    if (opcoes.cookie) cabecalhos.set('Cookie', opcoes.cookie);
    if (corpo !== undefined) cabecalhos.set('Content-Type', 'application/json');
    const ctx = createExecutionContext();
    const pedido = new Request(`http://app.invalid${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });
    const resposta = await app.fetch(pedido, env, ctx);
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
