import { join } from 'node:path';
import { aplicarMigracoes } from '../api/src/infraestrutura/db/migracoes/aplicar.ts';
import { lerMigracoes } from '../api/src/infraestrutura/db/migracoes/ler.ts';
import { exigirHostPermitido, HostRecusado } from '../api/src/infraestrutura/seguranca/trava-host.ts';
import { argumento, confirmarHost } from './comum/argumentos.ts';

const PASTA = join(import.meta.dirname, '../api/src/infraestrutura/db/migracoes');

async function principal(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url, alvo: argumento('alvo'), ci: process.env['CI'], confirmar: confirmarHost });

  const { aplicadas, puladas } = await aplicarMigracoes(url as string, lerMigracoes(PASTA));
  for (const nome of aplicadas) console.log(`aplicada: ${nome}`);
  for (const nome of puladas) console.log(`pulada:   ${nome}`);
  console.log(`${aplicadas.length} aplicada(s), ${puladas.length} já existente(s).`);
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof HostRecusado || erro instanceof Error ? erro.message : 'Erro.');
  process.exit(1);
});
