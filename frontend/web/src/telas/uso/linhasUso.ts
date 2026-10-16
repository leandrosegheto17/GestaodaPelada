import type { UsoPorSemana } from '@pelada/contrato';
import type { ColunaSemana, Semana } from '../../componentes/listas/TabelaSemanas';
import { diaMes } from '../../formatacao';

/** Colunas depois de "Semana": título longo (tabela) e curto (cartão do celular). */
export const colunasUso: readonly ColunaSemana[] = [
  { titulo: 'Aparelhos que abriram o ranking', tituloCurto: 'Aparelhos' },
  { titulo: 'PDFs exportados', tituloCurto: 'PDFs' },
  { titulo: 'Partidas lançadas (em até 48 h)', tituloCurto: 'Partidas (em até 48 h)' },
  { titulo: 'Escalações / partidas', tituloCurto: 'Escalações / partidas' },
];

/** Só formata o que a API devolveu, na ordem recebida (mais recente primeiro): nada é somado. */
export function linhasUso(semanas: UsoPorSemana['semanas']): Semana[] {
  return semanas.map((s) => ({
    rotulo: `${diaMes(s.inicio)} a ${diaMes(s.fim)}`,
    valores: [
      String(s.aparelhosRanking),
      String(s.pdfsExportados),
      `${s.partidasLancadas} (${s.partidasEm48h})`,
      `${s.escalacoesConfirmadas} / ${s.partidasLancadas}`,
    ],
  }));
}
