import type { SituacaoPresenca } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import type { PresencaGravada } from '../../infraestrutura/db/repositorios/partidas.js';
import { ativosNaData } from '../elenco/ativos.js';

export interface Marcacao {
  jogadorId: string;
  situacao: SituacaoPresenca;
}

export interface ProblemaDeMarcacao {
  indice: number;
  jogadorId: string;
  motivo: 'inativo_ou_fora_do_grupo' | 'repetido';
}

export class MarcacaoInvalida extends Error {
  constructor(readonly problemas: readonly ProblemaDeMarcacao[]) {
    super('Há marcação inválida.');
  }
}

export interface PresencasValidadas {
  /** Só presente, lesionado e expulso: a ausência não é gravada. */
  linhas: PresencaGravada[];
  contagem: { presentes: number; lesionados: number; expulsos: number };
}

/**
 * Confere as marcações contra os jogadores ativos na data: cada jogador aparece uma vez e precisa
 * estar ativo. Jogador de outro grupo ou inexistente tem o mesmo erro do inativo (não se revela
 * quem é de outro grupo). Reúne todos os problemas de uma vez.
 */
export function validarMarcacoes(
  ativos: readonly { id: string }[],
  marcacoes: readonly Marcacao[],
): PresencasValidadas {
  const permitidos = new Set(ativos.map((j) => j.id));
  const vistos = new Set<string>();
  const problemas: ProblemaDeMarcacao[] = [];
  marcacoes.forEach((m, indice) => {
    if (vistos.has(m.jogadorId)) problemas.push({ indice, jogadorId: m.jogadorId, motivo: 'repetido' });
    else if (!permitidos.has(m.jogadorId)) {
      problemas.push({ indice, jogadorId: m.jogadorId, motivo: 'inativo_ou_fora_do_grupo' });
    }
    vistos.add(m.jogadorId);
  });
  if (problemas.length > 0) throw new MarcacaoInvalida(problemas);

  const linhas: PresencaGravada[] = marcacoes.flatMap((m) =>
    m.situacao === 'ausente' ? [] : [{ jogadorId: m.jogadorId, situacao: m.situacao }],
  );
  const conta = (s: PresencaGravada['situacao']) => linhas.filter((l) => l.situacao === s).length;
  return {
    linhas,
    contagem: { presentes: conta('presente'), lesionados: conta('lesionado'), expulsos: conta('expulso') },
  };
}

/** Carrega os ativos na data e valida. Aceita uma transação, para rodar dentro da do chamador. */
export async function prepararPresencas(
  ex: ExecutorDb,
  grupoId: string,
  data: string,
  marcacoes: readonly Marcacao[],
): Promise<PresencasValidadas> {
  return validarMarcacoes(await ativosNaData(ex, grupoId, data), marcacoes);
}
