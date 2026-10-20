import { emTransacao, type Db } from '../../api/src/infraestrutura/db/index.ts';
import * as grupos from '../../api/src/infraestrutura/db/repositorios/grupos.ts';
import { calcularPlano, type PlanoImportacao } from './calculo.ts';
import { lerCorrecoes } from './correcoes.ts';
import { gravarPlano, verificarPrecondicoes, type ContagensGravadas } from './gravacao.ts';
import { lerCadastro } from './leitura-cadastro.ts';
import { lerPontuacoes } from './leitura-pontuacoes.ts';
import { contarPlano, linhasDeConferencia, linhasDeCorrecoes, linhasDeContagens } from './relatorio.ts';
import { ErroLegado } from './tipos.ts';

export interface OpcoesImportacao {
  db: Db;
  slug: string;
  textoPontuacoes: string;
  textoCadastro: string;
  /** JSON de correções do operador (`--correcoes`); sem ele nada muda. */
  textoCorrecoes?: string;
  dryRun: boolean;
  confirmoBackup: boolean;
  /** "Hoje" de São Paulo (`AAAA-MM-DD`); limita as datas lidas e dá a entrada de ativo sem rodada. */
  hoje: string;
  agora: Date;
  /** Devolve o que a pessoa digitou para confirmar o grupo alvo; só a execução real pergunta. */
  confirmarGrupo: (slug: string) => Promise<string>;
  /** Saída interativa: o relatório com apelidos só vai para o terminal do operador. */
  escrever: (linha: string) => void;
}

export type ResultadoImportacao =
  | { modo: 'dry-run'; plano: PlanoImportacao; problemas: string[] }
  | { modo: 'execucao'; plano: PlanoImportacao; gravado: ContagensGravadas };

/** Mesma leitura e mesmo cálculo no dry-run e na execução real: o relatório vem do plano, não da gravação. */
export function prepararPlano(
  op: Pick<OpcoesImportacao, 'textoPontuacoes' | 'textoCadastro' | 'textoCorrecoes' | 'hoje'>,
): PlanoImportacao {
  const pontuacoes = lerPontuacoes(op.textoPontuacoes, op.hoje);
  const cadastro = lerCadastro(op.textoCadastro, op.hoje);
  const correcoes = op.textoCorrecoes === undefined ? undefined : lerCorrecoes(op.textoCorrecoes);
  return calcularPlano(pontuacoes, cadastro, op.hoje, correcoes);
}

function relatar(plano: PlanoImportacao, escrever: (linha: string) => void): void {
  for (const linha of linhasDeContagens(contarPlano(plano))) escrever(linha);
  for (const linha of linhasDeCorrecoes(plano)) escrever(linha);
  for (const linha of linhasDeConferencia(plano)) escrever(linha);
}

export async function importarLegado(op: OpcoesImportacao): Promise<ResultadoImportacao> {
  const grupo = await grupos.buscarPorSlug(op.db, op.slug);
  if (!grupo) throw new ErroLegado('Grupo não encontrado.');
  if (grupo.arquivadoEm) throw new ErroLegado('O grupo está arquivado.');

  const plano = prepararPlano(op);
  relatar(plano, op.escrever);
  if (plano.conferencia.some((c) => !c.confere)) {
    throw new ErroLegado(
      'Há jogador cujo total calculado difere do "Atual" por mais (ou menos) que o ajuste manual e as correções do usuário.',
    );
  }

  if (op.dryRun) {
    const problemas = await verificarPrecondicoes(op.db, grupo.id, plano);
    for (const problema of problemas) op.escrever(`Pré-condição: ${problema}`);
    op.escrever('Dry-run concluído: nada foi gravado.');
    return { modo: 'dry-run', plano, problemas };
  }

  if (!op.confirmoBackup) throw new ErroLegado('Confirme o backup com --confirmo-backup antes da execução real.');
  if ((await op.confirmarGrupo(grupo.slug)) !== grupo.slug) {
    throw new ErroLegado('O grupo digitado não confere. Nada foi gravado.');
  }
  const gravado = await emTransacao(op.db, (tx) => gravarPlano(tx, grupo, plano, op.agora));
  op.escrever('Importação concluída.');
  return { modo: 'execucao', plano, gravado };
}
