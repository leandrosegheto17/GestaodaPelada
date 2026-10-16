import { diaSemana, grupoDetalhe, type GrupoDetalhe } from '@pelada/contrato';
import { dataSugeridaPartida, mesDe, proximoDiaDeJogo } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as eventos from '../../infraestrutura/db/repositorios/eventos.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../infraestrutura/db/repositorios/pesos.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';
import { ativosNaData } from '../elenco/ativos.js';
import { indiceDiaSemana } from './dia-semana.js';
import { urlPublicaDoGrupo } from './url-publica.js';

export interface EntradaDetalhe {
  grupoId: string;
  acessaFinanceiro: boolean;
  /** "Hoje" de São Paulo, vindo do relógio da API. */
  hoje: string;
  urlPublica: string;
}

/**
 * Grupo com o resumo da tela inicial do admin. `escalacaoConfirmadaPara` e `saldoAtualCentavos`
 * ficam nulos até os incrementos do simulador e do financeiro os preencherem (um só lugar:
 * o objeto `inicio` abaixo).
 */
export async function carregarGrupoDetalhe(ex: ExecutorDb, e: EntradaDetalhe): Promise<GrupoDetalhe | null> {
  const grupo = await grupos.buscarPorId(ex, e.grupoId);
  if (!grupo) return null;
  const dia = indiceDiaSemana(diaSemana.parse(grupo.diaSemana));
  const sugerida = dataSugeridaPartida(e.hoje, dia);

  const [naData, doMes, ativos, catalogo, vigente, admins, aparelhos] = await Promise.all([
    partidas.porData(ex, e.grupoId, sugerida),
    partidas.porMes(ex, e.grupoId, mesDe(e.hoje)),
    ativosNaData(ex, e.grupoId, e.hoje),
    habilidades.listar(ex, e.grupoId),
    pesos.vigenteEm(ex, e.grupoId, e.hoje),
    vinculos.contarAdmins(ex, e.grupoId),
    eventos.aparelhosDaSemana(ex, e.grupoId, e.hoje),
  ]);

  return grupoDetalhe.parse({
    grupo: {
      id: grupo.id,
      nome: grupo.nome,
      slug: grupo.slug,
      urlPublica: urlPublicaDoGrupo(e.urlPublica, grupo.slug),
      diaSemana: grupo.diaSemana,
      frequencia: grupo.frequencia,
      horario: grupo.horario,
    },
    permissoes: { acessaFinanceiro: e.acessaFinanceiro },
    hoje: e.hoje,
    inicio: {
      dataSugeridaPartida: sugerida,
      partidaNaDataSugerida: naData !== null,
      proximoDiaDeJogo: proximoDiaDeJogo(e.hoje, dia),
      escalacaoConfirmadaPara: null,
      partidasNoMes: doMes.length,
      jogadoresAtivos: ativos.length,
      habilidades: catalogo.length,
      pesosVigentesDesde: vigente?.vigenteDesde ?? e.hoje,
      admins,
      aparelhosNaSemana: aparelhos,
      saldoAtualCentavos: null,
    },
  });
}
