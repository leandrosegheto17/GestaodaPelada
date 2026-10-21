import { criarDb, fecharDb } from '../api/src/infraestrutura/db/index.ts';
import { exigirHostPermitido, HostRecusado } from '../api/src/infraestrutura/seguranca/trava-host.ts';
import { argumento, confirmarHost } from './comum/argumentos.ts';
import { hojeEmSaoPaulo } from './comum/hoje.ts';
import { verificarInicio } from './verificar-inicio/verificar.ts';

/**
 * Confere que a data de início da pontuação não mudou o acumulado de ninguém. Somente leitura.
 * Uso: tsx backend/scripts/verificar-inicio.ts [--alvo producao|teste]
 * Variável: DATABASE_URL (nunca por argumento). Saída 0 sem diferença; 1 com diferença ou erro.
 * O log identifica o jogador pelo id; apelido e telefone não vão para o log.
 */
async function principal(): Promise<number> {
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url, alvo: argumento('alvo'), ci: process.env['CI'], confirmar: confirmarHost });

  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: url as string }, { waitUntil: (p) => void promessas.push(p) });
  try {
    const { diferencas } = await verificarInicio({
      db,
      hoje: hojeEmSaoPaulo(new Date()),
      escrever: (linha) => console.log(linha),
    });
    return diferencas === 0 ? 0 : 1;
  } finally {
    await fecharDb(db);
    await Promise.all(promessas);
  }
}

principal().then(
  (codigo) => process.exit(codigo),
  (erro: unknown) => {
    console.error(erro instanceof HostRecusado ? erro.message : 'Falha ao verificar a data de início.');
    process.exit(1);
  },
);
