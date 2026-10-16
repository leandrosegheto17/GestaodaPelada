import { Kysely, PostgresDialect, type PostgresPool, type PostgresPoolClient } from 'kysely';
import pg from 'pg';
import type { TabelasBanco } from './tipos.js';

declare const marca: unique symbol;

/** Conexão do módulo de dados. Opaca: só os repositórios sabem abri-la. */
export type Db = { readonly [marca]: 'db' };
/** Transação aberta por `emTransacao`. Opaca. */
export type Tx = { readonly [marca]: 'tx' };
/** O que um repositório aceita: a conexão ou uma transação em andamento. */
export type ExecutorDb = Db | Tx;

interface DbInterno {
  kysely: Kysely<TabelasBanco>;
  transacao: boolean;
  fechar?: () => Promise<void>;
}

const internos = new WeakMap<object, DbInterno>();

/** Desembrulha o executor para os repositórios deste módulo. Não é exportado pelo `index.ts`. */
export function kyselyDe(executor: ExecutorDb): Kysely<TabelasBanco> {
  const interno = internos.get(executor);
  if (!interno) throw new Error('Executor de banco desconhecido.');
  return interno.kysely;
}

export function ehTransacao(executor: ExecutorDb): boolean {
  return internos.get(executor)?.transacao ?? false;
}

export function embrulhar(kysely: Kysely<TabelasBanco>, transacao: boolean): ExecutorDb {
  const executor: ExecutorDb = {} as ExecutorDb;
  internos.set(executor, { kysely, transacao });
  return executor;
}

/** O que o Worker entrega: a string de conexão do binding do Hyperdrive. */
export interface FonteDeConexao {
  connectionString: string;
}
export interface ContextoDeExecucao {
  waitUntil(promessa: Promise<unknown>): void;
}

/**
 * Cria a conexão de UMA requisição. A conexão só abre na primeira consulta e o `waitUntil`
 * mantém o Worker vivo até `fecharDb` rodar (o app chama em `finally`, depois de responder).
 * Nunca guardar o resultado em variável de módulo.
 */
export function criarDb(fonte: FonteDeConexao, contexto: ContextoDeExecucao): Db {
  const cliente = new pg.Client({ connectionString: fonte.connectionString });
  let conexao: Promise<void> | null = null;
  const abrir = (): Promise<void> => (conexao ??= cliente.connect().then(() => undefined));

  // Pool de um cliente só: liberar não fecha; quem fecha é `fecharDb`.
  const clienteDoPool: PostgresPoolClient = Object.assign(cliente, { release: () => undefined });
  const pool: PostgresPool = {
    connect: async () => {
      await abrir();
      return clienteDoPool;
    },
    end: async () => undefined,
    options: {},
  };

  let terminar: () => void = () => undefined;
  contexto.waitUntil(new Promise<void>((resolver) => (terminar = resolver)));

  const kysely = new Kysely<TabelasBanco>({ dialect: new PostgresDialect({ pool }) });
  const executor = embrulhar(kysely, false);
  const interno = internos.get(executor);
  if (interno) {
    interno.fechar = async () => {
      try {
        if (conexao) {
          await conexao.catch(() => undefined);
          await cliente.end().catch(() => undefined);
        }
      } finally {
        terminar();
      }
    };
  }
  return executor as Db;
}

/** Fecha a conexão da requisição. Seguro chamar mais de uma vez. */
export async function fecharDb(db: Db): Promise<void> {
  await internos.get(db)?.fechar?.();
}
