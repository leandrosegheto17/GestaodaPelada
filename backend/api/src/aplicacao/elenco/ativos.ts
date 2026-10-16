import { ativosEm, ativosNoMes as ativosNoMesDoDominio, compararApelido, type ComPeriodos } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';

type Linha = ComPeriodos & { id: string; apelido: string };

/** Jogadores ativos na data, por apelido. A regra de atividade é do domínio. */
export function ordenarAtivosNaData<T extends Linha>(lista: readonly T[], data: string): T[] {
  return ativosEm(lista, data).sort(compararApelido);
}

/** Jogadores ativos em algum dia do mês (`AAAA-MM`), por apelido. */
export function ordenarAtivosNoMes<T extends Linha>(lista: readonly T[], mes: string): T[] {
  return ativosNoMesDoDominio(lista, mes).sort(compararApelido);
}

export async function ativosNaData(ex: ExecutorDb, grupoId: string, data: string) {
  return ordenarAtivosNaData(await jogadores.listar(ex, grupoId), data);
}

export async function ativosNoMes(ex: ExecutorDb, grupoId: string, mes: string) {
  return ordenarAtivosNoMes(await jogadores.listar(ex, grupoId), mes);
}
