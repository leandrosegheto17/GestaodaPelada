import { readFileSync } from 'node:fs';
import { criarDb, fecharDb } from '../api/src/infraestrutura/db/index.ts';
import { exigirHostPermitido, HostRecusado } from '../api/src/infraestrutura/seguranca/trava-host.ts';
import { confirmarHost, perguntar } from './comum/argumentos.ts';
import { lerArgumentosLegado } from './importar-legado/argumentos.ts';
import { importarLegado } from './importar-legado/executar.ts';
import { ErroLegado } from './importar-legado/tipos.ts';

/**
 * Importa o histórico do legado (cadastro e rodadas) para um grupo novo, numa única transação.
 * Uso: tsx backend/scripts/importar-legado.ts --grupo <slug> --cadastro <arquivo> --rodadas <arquivo>
 *        [--dry-run] [--confirmo-backup] [--alvo producao|teste]
 * Variável: DATABASE_URL (nunca por argumento). `--dry-run` lê e confere sem gravar; a execução real exige
 * `--confirmo-backup` e a digitação do slug do grupo. Telefone não é lido.
 */
/** `AAAA-MM-DD` de São Paulo, o mesmo "hoje" do resto do sistema. */
const hojeEmSaoPaulo = (agora: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);

async function principal(): Promise<void> {
  const args = lerArgumentosLegado(process.argv.slice(2));
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url, alvo: args.alvo, ci: process.env['CI'], confirmar: confirmarHost });

  const agora = new Date();
  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: url as string }, { waitUntil: (p) => void promessas.push(p) });
  try {
    await importarLegado({
      db,
      slug: args.grupo,
      textoPontuacoes: readFileSync(args.rodadas, 'utf8'),
      textoCadastro: readFileSync(args.cadastro, 'utf8'),
      dryRun: args.dryRun,
      confirmoBackup: args.confirmoBackup,
      hoje: hojeEmSaoPaulo(agora),
      agora,
      confirmarGrupo: (slug) => perguntar(`Digite o slug do grupo (${slug}) para confirmar a gravação: `),
      escrever: (linha) => console.log(linha),
    });
  } finally {
    await fecharDb(db);
    await Promise.all(promessas);
  }
}

principal().catch((erro: unknown) => {
  const conhecido = erro instanceof ErroLegado || erro instanceof HostRecusado;
  console.error(conhecido ? erro.message : 'Falha ao executar a importação. Nada foi gravado.');
  process.exit(1);
});
