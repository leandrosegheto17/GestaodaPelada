import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  aplicarMigracoes,
  PADRAO_NOME_MIGRACAO,
} from '../api/src/infraestrutura/db/migracoes/aplicar.ts';
import {
  exigirHostPermitido,
  HostRecusado,
} from '../api/src/infraestrutura/seguranca/trava-host.ts';

const PASTA = join(import.meta.dirname, '../api/src/infraestrutura/db/migracoes');

function argumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function confirmar(): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const leitura = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await leitura.question('Digite o host do banco para confirmar: ');
  } finally {
    leitura.close();
  }
}

async function principal(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url, alvo: argumento('alvo'), ci: process.env['CI'], confirmar });

  const nomes = readdirSync(PASTA).filter((nome) => nome.endsWith('.sql'));
  const invalido = nomes.find((nome) => !PADRAO_NOME_MIGRACAO.test(nome));
  if (invalido) throw new Error(`Nome de migração inválido: ${invalido}`);
  const migracoes = nomes
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(join(PASTA, nome), 'utf8') }));

  const { aplicadas, puladas } = await aplicarMigracoes(url as string, migracoes);
  for (const nome of aplicadas) console.log(`aplicada: ${nome}`);
  for (const nome of puladas) console.log(`pulada:   ${nome}`);
  console.log(`${aplicadas.length} aplicada(s), ${puladas.length} já existente(s).`);
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof HostRecusado || erro instanceof Error ? erro.message : 'Erro.');
  process.exit(1);
});
