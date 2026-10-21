import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { HABILIDADES_INICIAIS, PESOS_PADRAO } from '@pelada/dominio';
import { aplicarMigracoes } from '../../../api/src/infraestrutura/db/migracoes/aplicar.ts';
import { lerMigracoes } from '../../../api/src/infraestrutura/db/migracoes/ler.ts';
import { criarDb, fecharDb, type Db } from '../../../api/src/infraestrutura/db/index.ts';
import * as habilidades from '../../../api/src/infraestrutura/db/repositorios/habilidades.ts';
import * as pesos from '../../../api/src/infraestrutura/db/repositorios/pesos.ts';
import { exigirHostPermitido } from '../../../api/src/infraestrutura/seguranca/trava-host.ts';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const PASTA_MIGRACOES = join(RAIZ, 'backend/api/src/infraestrutura/db/migracoes');
const requireApi = createRequire(join(RAIZ, 'backend/api/package.json'));

interface ClientePg {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(texto: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
const pg = requireApi('pg') as { Client: new (opcoes: { connectionString: string }) => ClientePg };

const BASE = process.env['DATABASE_URL_TESTE'] ?? 'postgres://postgres:postgres@localhost:5432/pelada_teste';
const urlDe = (nome: string): string => {
  const url = new URL(BASE);
  url.pathname = `/${nome}`;
  return url.toString();
};

export const SLUG_DO_TESTE = 'grupo-ficticio';

export interface BancoDescartavel {
  db: Db;
  /** Conexão do banco descartável, para quem precisa abrir a própria (scripts em processo à parte). */
  url: string;
  grupoId: string;
  contaId: string;
  /** SQL de apoio dos testes (contagens e conferências). */
  consultar<T extends Record<string, unknown>>(sql: string, parametros?: unknown[]): Promise<T[]>;
  derrubar(): Promise<void>;
}

/** Banco novo e vazio, com as migrações aplicadas (menos as de `semMigracoes`) e um grupo recém-criado. */
export async function criarBancoDescartavel(semMigracoes: readonly string[] = []): Promise<BancoDescartavel> {
  await exigirHostPermitido({ url: BASE });
  const nome = `pelada_imp_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: urlDe('postgres') });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${nome}`);
  } finally {
    await admin.end();
  }
  const url = urlDe(nome);
  await aplicarMigracoes(
    url,
    lerMigracoes(PASTA_MIGRACOES).filter((m) => !semMigracoes.some((parte) => m.nome.includes(parte))),
  );
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  const consultar = async <T extends Record<string, unknown>>(sql: string, parametros: unknown[] = []) =>
    (await cliente.query(sql, parametros)).rows as T[];

  const conta = (
    await consultar<{ id: string }>(
      `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('admin@exemplo.test', 'Admin', 'x', now()) RETURNING id`,
    )
  )[0]!.id;
  const grupo = (
    await consultar<{ id: string }>(
      `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
       VALUES ('Grupo Ficticio', $1, 'domingo', 'semanal', '09:00', $2, now()) RETURNING id`,
      [SLUG_DO_TESTE, conta],
    )
  )[0]!.id;

  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: url }, { waitUntil: (p) => void promessas.push(p) });
  await habilidades.criarCatalogoInicial(db, grupo, HABILIDADES_INICIAIS);
  // Sem a migração de adequação o esquema é o anterior e o repositório de pesos não o conhece.
  if (semMigracoes.length === 0) {
    await pesos.criarPadrao(db, grupo, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-01-01',
      registradoPor: conta,
      agora: new Date('2026-01-01T12:00:00Z'),
    });
  }

  return {
    db,
    url,
    grupoId: grupo,
    contaId: conta,
    consultar,
    async derrubar() {
      await fecharDb(db);
      await Promise.all(promessas);
      await cliente.end();
      const encerrar = new pg.Client({ connectionString: urlDe('postgres') });
      await encerrar.connect();
      try {
        await encerrar.query(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`);
      } finally {
        await encerrar.end();
      }
    },
  };
}
