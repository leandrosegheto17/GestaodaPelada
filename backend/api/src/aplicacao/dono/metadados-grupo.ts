import type { Grupo } from '../../infraestrutura/db/repositorios/grupos.js';

const formatadorData = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Dia (`AAAA-MM-DD`) de um instante no fuso de São Paulo. */
export function dataEmSaoPaulo(instante: Date): string {
  return formatadorData.format(instante);
}

export interface MetadadosGrupo {
  id: string;
  nome: string;
  diaSemana: string;
  frequencia: string;
  horario: string;
  situacaoComercial: string;
  inicioTrial: string | null;
  criadoEm: string;
  arquivadoEm: string | null;
}

/** O que o dono pode ver de um grupo: metadados, nunca dado de jogo (RF-07). */
export function paraMetadadosGrupo(grupo: Grupo): MetadadosGrupo {
  return {
    id: grupo.id,
    nome: grupo.nome,
    diaSemana: grupo.diaSemana,
    frequencia: grupo.frequencia,
    horario: grupo.horario,
    situacaoComercial: grupo.situacaoComercial,
    inicioTrial: grupo.trialInicio,
    criadoEm: dataEmSaoPaulo(grupo.criadoEm),
    arquivadoEm: grupo.arquivadoEm ? dataEmSaoPaulo(grupo.arquivadoEm) : null,
  };
}

/** Único lugar que monta o link público do grupo; a base vem de `URL_PUBLICA`. */
export function urlPublicaDoGrupo(urlPublica: string, slug: string): string {
  return `${urlPublica.replace(/\/+$/, '')}/g/${slug}`;
}
