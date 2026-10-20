import type { ExecutorDb, Tx } from '../../api/src/infraestrutura/db/index.ts';
import * as auditoria from '../../api/src/infraestrutura/db/repositorios/auditoria.ts';
import * as habilidades from '../../api/src/infraestrutura/db/repositorios/habilidades.ts';
import * as jogadores from '../../api/src/infraestrutura/db/repositorios/jogadores.ts';
import * as partidas from '../../api/src/infraestrutura/db/repositorios/partidas.ts';
import * as pesos from '../../api/src/infraestrutura/db/repositorios/pesos.ts';
import { PESOS_LEGADO, VIGENCIA_LEGADO, type PlanoImportacao } from './calculo.ts';
import { chaveDe, ErroLegado } from './tipos.ts';

/** Coluna ausente do Postgres: a migração da etapa 1 ainda não foi aplicada neste banco. */
const COLUNA_INEXISTENTE = '42703';
export const QUANTAS_HABILIDADES = 6;

export interface ContagensGravadas {
  jogadores: number;
  inativados: number;
  notas: number;
  partidas: number;
  presencas: number;
  configuracoesSubstituidas: number;
}

/** Problemas que impedem a gravação, sem escrever nada. Lista vazia = pode gravar. */
export async function verificarPrecondicoes(
  ex: ExecutorDb,
  grupoId: string,
  plano: PlanoImportacao,
): Promise<string[]> {
  const problemas: string[] = [];
  if ((await partidas.mesDaPrimeiraPartida(ex, grupoId)) !== null) {
    problemas.push('O grupo já tem partidas registradas: a importação só roda em grupo sem partida.');
  }
  try {
    const existentes = new Set((await jogadores.listar(ex, grupoId)).map((j) => chaveDe(j.apelido)));
    const repetidos = plano.jogadores.filter((j) => existentes.has(chaveDe(j.apelido))).length;
    if (repetidos > 0) problemas.push(`${repetidos} apelido(s) do arquivo já existem no grupo.`);
  } catch (erro) {
    if ((erro as { code?: string }).code !== COLUNA_INEXISTENTE) throw erro;
    // A transação fica inutilizável depois do erro: nada mais é consultado.
    return [...problemas, 'A migração da pontuação inicial (etapa 1) ainda não foi aplicada neste banco.'];
  }
  const catalogo = await habilidades.listar(ex, grupoId);
  if (catalogo.length < QUANTAS_HABILIDADES) {
    problemas.push(`O grupo precisa de ${QUANTAS_HABILIDADES} habilidades no catálogo.`);
  }
  return problemas;
}

/**
 * Grava o plano inteiro dentro da transação recebida: jogadores (com períodos e notas), a configuração de
 * pesos do legado no lugar das existentes, partidas com presenças e a auditoria. Qualquer falha desfaz tudo.
 */
export async function gravarPlano(
  tx: Tx,
  grupo: { id: string; criadoPor: string },
  plano: PlanoImportacao,
  agora: Date,
): Promise<ContagensGravadas> {
  const problemas = await verificarPrecondicoes(tx, grupo.id, plano);
  if (problemas.length > 0) throw new ErroLegado(problemas.join(' '));

  const catalogo = await habilidades.listar(tx, grupo.id);
  const idPorApelido = new Map<string, string>();
  let inativados = 0;
  let notas = 0;
  for (const j of plano.jogadores) {
    const id = await jogadores.criar(tx, grupo.id, {
      apelido: j.apelido,
      anoNascimento: j.anoNascimento,
      posicao: j.posicao,
      telefone: null,
      pontuacaoInicial: j.pontuacaoInicial,
      dataEntrada: j.entrada,
      autor: grupo.criadoPor,
      agora,
    });
    idPorApelido.set(chaveDe(j.apelido), id);
    if (j.saida !== null) {
      await jogadores.inativar(tx, grupo.id, id, j.saida);
      inativados++;
    }
    for (const [i, nota] of (j.notas ?? []).entries()) {
      const habilidade = catalogo[i];
      if (habilidade && (await habilidades.gravarNota(tx, grupo.id, id, habilidade.id, nota))) notas++;
    }
  }

  const { removidas } = await pesos.substituirTodas(tx, grupo.id, {
    pesos: PESOS_LEGADO,
    vigenteDesde: VIGENCIA_LEGADO,
    registradoPor: grupo.criadoPor,
    agora,
  });

  let presencas = 0;
  for (const p of plano.partidas) {
    const marcadas = p.presencas.map((m) => ({
      jogadorId: idPorApelido.get(chaveDe(m.apelido)) as string,
      situacao: m.situacao,
    }));
    await partidas.criar(tx, grupo.id, {
      data: p.data,
      choveu: p.choveu,
      presencas: marcadas,
      autor: grupo.criadoPor,
      agora,
    });
    presencas += marcadas.length;
  }

  const contagens: ContagensGravadas = {
    jogadores: plano.jogadores.length,
    inativados,
    notas,
    partidas: plano.partidas.length,
    presencas,
    configuracoesSubstituidas: removidas,
  };
  await auditoria.registrar(tx, grupo.id, {
    autor: { tipo: 'infraestrutura' },
    acao: 'importacao_legado',
    entidade: 'grupo',
    entidadeId: grupo.id,
    resumo: { ...contagens },
    agora,
  });
  return contagens;
}
