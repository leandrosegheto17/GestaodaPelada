import { email } from '@pelada/contrato';

/** Variáveis e bindings que o Worker recebe. */
export interface Env {
  HYPERDRIVE: Hyperdrive;
  /** Limite de tentativas de login por IP (Rate Limiting do Workers). */
  LIMITE_ENTRAR?: RateLimit;
  /** Limite das rotas públicas por IP. */
  LIMITE_PUBLICO?: RateLimit;
  URL_PUBLICA: string;
  ENDERECO_NOVO?: string;
  DONO_EMAIL: string;
}

export interface Config {
  urlPublica: string;
  /** Endereço para onde o app mudou, quando houver (ADR-010). */
  enderecoNovo: string | null;
  donoEmail: string;
}

export class ConfigInvalida extends Error {
  constructor(readonly variavel: string) {
    super(`Configuração inválida: ${variavel}`);
  }
}

const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Aceita https; http só em localhost. Sem barra final, caminho, consulta ou credenciais. */
function lerUrl(variavel: string, valor: string | undefined): string {
  if (!valor) throw new ConfigInvalida(variavel);
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new ConfigInvalida(variavel);
  }
  const seguro = url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL.has(url.hostname));
  const limpo = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  if (!seguro || !limpo || valor.endsWith('/')) throw new ConfigInvalida(variavel);
  return url.origin;
}

/** Lê e valida a configuração. Pura: chamada por requisição, sem estado global. */
export function lerConfig(env: Partial<Record<keyof Env, unknown>>): Config {
  const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
  const dono = email.safeParse(texto(env.DONO_EMAIL));
  if (!dono.success) throw new ConfigInvalida('DONO_EMAIL');
  const novo = texto(env.ENDERECO_NOVO);
  return {
    urlPublica: lerUrl('URL_PUBLICA', texto(env.URL_PUBLICA)),
    enderecoNovo: novo ? lerUrl('ENDERECO_NOVO', novo) : null,
    donoEmail: dono.data,
  };
}
