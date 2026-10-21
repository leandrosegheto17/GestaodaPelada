import { acumuladoPorInicio, agruparPresencasPorJogador, criarResolvedorDePesos } from '@pelada/dominio';
import { emLeitura, type Db } from '../../api/src/infraestrutura/db/index.ts';
import * as grupos from '../../api/src/infraestrutura/db/repositorios/grupos.ts';
import * as jogadores from '../../api/src/infraestrutura/db/repositorios/jogadores.ts';
import * as partidas from '../../api/src/infraestrutura/db/repositorios/partidas.ts';
import * as pesos from '../../api/src/infraestrutura/db/repositorios/pesos.ts';

export interface OpcoesVerificacao {
  db: Db;
  /** `AAAA-MM-DD` de São Paulo. */
  hoje: string;
  escrever: (linha: string) => void;
}

export interface ResultadoVerificacao {
  jogadores: number;
  diferencas: number;
}

/**
 * Compara, para todo jogador de todo grupo, o acumulado de hoje pela regra de antes da data de início
 * (tudo o que o jogador tem) com o da regra nova (a partir da data de início gravada). Só leitura, numa
 * transação única. A saída identifica o jogador pelo id: apelido e telefone nunca vão para o log.
 * Logo depois da migração o resultado tem de ser zero diferença; depois que alguém altera uma data de
 * início, a diferença é esperada naquele jogador.
 */
export async function verificarInicio({ db, hoje, escrever }: OpcoesVerificacao): Promise<ResultadoVerificacao> {
  return emLeitura(db, async (tx) => {
    let total = 0;
    let diferencas = 0;
    for (const { id: grupoId } of await grupos.listarTodosComAdmins(tx)) {
      const [elenco, historico, configsPesos] = await Promise.all([
        jogadores.listar(tx, grupoId),
        partidas.historicoAte(tx, grupoId, hoje),
        pesos.historico(tx, grupoId),
      ]);
      const presencas = agruparPresencasPorJogador(historico.partidas, historico.presencas);
      const configs = criarResolvedorDePesos(
        configsPesos.map((c) => ({ ...c, registradoEm: c.registradoEm.toISOString() })),
      );
      for (const jogador of elenco) {
        const doJogador = presencas.get(jogador.id) ?? [];
        // Sem data gravada, a pontuação começa no início do primeiro período.
        const inicio = jogador.inicioPontuacao ?? jogador.periodos[0]?.inicio;
        const base = { pontuacaoInicial: jogador.pontuacaoInicial, presencas: doJogador, configs, referencia: hoje };
        const atual = acumuladoPorInicio(base);
        const novo = acumuladoPorInicio({ ...base, inicio });
        const primeira = doJogador.map((p) => p.data).sort()[0] ?? '-';
        const diferente = atual !== novo;
        total += 1;
        if (diferente) diferencas += 1;
        escrever(
          `grupo=${grupoId} jogador=${jogador.id} atual=${atual} novo=${novo} inicio=${inicio ?? '-'} ` +
            `primeiraPresenca=${primeira} ${diferente ? 'DIFERENTE' : 'ok'}`,
        );
      }
    }
    escrever(`${total} jogador(es) verificado(s), ${diferencas} com diferença.`);
    return { jogadores: total, diferencas };
  });
}
