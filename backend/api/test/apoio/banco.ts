import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { exigirHostPermitido } from '../../src/infraestrutura/seguranca/trava-host.js';

/** URL do Postgres descartável dos testes; vazia quando não há banco disponível. */
export const URL_TESTE = process.env['DATABASE_URL_TESTE'] ?? '';
export const temBanco = URL_TESTE !== '';

function comBanco(url: string, banco: string): string {
  const nova = new URL(url);
  nova.pathname = `/${banco}`;
  return nova.toString();
}

export interface BancoTemporario {
  url: string;
  remover(): Promise<void>;
}

/**
 * Cria um banco novo no servidor de teste e devolve a URL dele. Passa pela trava de host
 * antes de conectar e `remover` apaga o banco, mesmo se o teste falhar.
 */
export async function criarBancoTemporario(): Promise<BancoTemporario> {
  await exigirHostPermitido({ url: URL_TESTE });
  const nome = `teste_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: URL_TESTE });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${nome}`);
  } finally {
    await admin.end();
  }
  return {
    url: comBanco(URL_TESTE, nome),
    async remover() {
      const cliente = new pg.Client({ connectionString: URL_TESTE });
      await cliente.connect();
      try {
        await cliente.query(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`);
      } finally {
        await cliente.end();
      }
    },
  };
}
