import { compararMeses, entradaDaMensalidade, mesDe } from '@pelada/dominio';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../infraestrutura/db/repositorios/financeiro.js';
import { ativosNoMes } from '../elenco/ativos.js';

export const MSG_JOGADOR_FORA_DO_MES = 'O jogador precisa estar ativo no grupo nesse mês.';
export const MSG_MES_FUTURO = 'Não dá para marcar o pagamento de um mês que ainda não começou.';

export type ResultadoMarcar =
  { tipo: 'ok' } | { tipo: 'invalido'; campos: Record<string, string> } | { tipo: 'ja_marcado' };

/**
 * Marca o pagamento do mês. Com mensalidade configurada cria a entrada vinculada (valor da configuração,
 * nunca do cliente); sem ela, só a marcação. A unicidade (jogador, mês) é do banco: a corrida cai em
 * `ja_marcado` e nada fica gravado pela metade.
 */
export async function marcarPagamento(
  db: Db,
  grupoId: string,
  corpo: { jogadorId: string; mes: string },
  contexto: { autorContaId: string; hoje: string; agora: Date },
): Promise<ResultadoMarcar> {
  if (compararMeses(corpo.mes, mesDe(contexto.hoje)) > 0) return { tipo: 'invalido', campos: { mes: MSG_MES_FUTURO } };
  const [ativos, config] = await Promise.all([ativosNoMes(db, grupoId, corpo.mes), financeiro.lerConfig(db, grupoId)]);
  const jogador = ativos.find((j) => j.id === corpo.jogadorId);
  if (!jogador) return { tipo: 'invalido', campos: { jogadorId: MSG_JOGADOR_FORA_DO_MES } };

  const entrada = entradaDaMensalidade({
    apelido: jogador.apelido,
    mes: corpo.mes,
    mensalidadeCentavos: config?.mensalidadeCentavos ?? null,
    hoje: contexto.hoje,
  });
  try {
    await emTransacao(db, async (tx) => {
      await financeiro.marcar(tx, grupoId, {
        jogadorId: jogador.id,
        mes: corpo.mes,
        lancamento: entrada
          ? { data: entrada.data, descricao: entrada.descricao, valorCentavos: entrada.valorCentavos }
          : null,
        autor: contexto.autorContaId,
        agora: contexto.agora,
      });
      await auditoria.registrar(tx, grupoId, {
        autor: { tipo: 'conta', contaId: contexto.autorContaId },
        acao: 'pagamento_marcado',
        entidade: 'pagamento_mes',
        entidadeId: jogador.id,
        resumo: { mes: corpo.mes, valorCentavos: entrada?.valorCentavos ?? null },
        agora: contexto.agora,
      });
    });
  } catch (erro) {
    if (erro instanceof financeiro.PagamentoJaMarcado) return { tipo: 'ja_marcado' };
    if (erro instanceof financeiro.JogadorNaoEncontrado) {
      return { tipo: 'invalido', campos: { jogadorId: MSG_JOGADOR_FORA_DO_MES } };
    }
    throw erro;
  }
  return { tipo: 'ok' };
}
