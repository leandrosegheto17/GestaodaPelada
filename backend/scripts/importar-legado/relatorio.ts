import type { PlanoImportacao } from './calculo.ts';

export interface ContagensDoPlano {
  jogadores: number;
  ativos: number;
  inativos: number;
  partidas: number;
  comChuva: number;
  presencas: number;
  notas: number;
  rodadasMistas: number;
  jogadoresComLacuna: number;
  diferencasEsperadas: number;
  divergencias: number;
}

export function contarPlano(plano: PlanoImportacao): ContagensDoPlano {
  const ativos = plano.jogadores.filter((j) => j.ativo).length;
  return {
    jogadores: plano.jogadores.length,
    ativos,
    inativos: plano.jogadores.length - ativos,
    partidas: plano.partidas.length,
    comChuva: plano.partidas.filter((p) => p.choveu).length,
    presencas: plano.partidas.reduce((soma, p) => soma + p.presencas.length, 0),
    notas: plano.jogadores.reduce((soma, j) => soma + (j.notas?.length ?? 0), 0),
    rodadasMistas: plano.partidas.filter((p) => p.mista).length,
    jogadoresComLacuna: plano.comLacuna,
    diferencasEsperadas: plano.conferencia.filter((c) => c.confere && c.ajustes !== 0).length,
    divergencias: plano.conferencia.filter((c) => !c.confere).length,
  };
}

const sinal = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** Linhas só de contagens: podem ir para qualquer log. */
export function linhasDeContagens(c: ContagensDoPlano): string[] {
  return [
    `Jogadores: ${c.jogadores} (${c.ativos} ativos, ${c.inativos} inativos)`,
    `Partidas: ${c.partidas} (${c.comChuva} com chuva), presenças: ${c.presencas}`,
    `Notas de habilidades: ${c.notas}`,
    `Rodadas com valor simples e em dobro misturados: ${c.rodadasMistas}`,
    `Jogadores com lacuna no meio do histórico: ${c.jogadoresComLacuna}`,
    `Diferenças esperadas (= ajuste manual do legado): ${c.diferencasEsperadas}`,
    `Divergências (diferença ≠ ajuste): ${c.divergencias}`,
  ];
}

/** Calculado × "Atual" por jogador. Traz apelidos: vai só para o terminal do operador, nunca para arquivo. */
export function linhasDeConferencia(plano: PlanoImportacao): string[] {
  return plano.conferencia
    .filter((c) => !c.confere || c.ajustes !== 0)
    .map((c) =>
      c.confere
        ? `diferença esperada: ${c.apelido} calculado ${c.calculado} × Atual ${c.atual} (ajuste ${sinal(c.ajustes)})`
        : `DIVERGÊNCIA: ${c.apelido} calculado ${c.calculado} × Atual ${c.atual} (diferença ${sinal(c.diferenca)}, ajuste ${sinal(c.ajustes)})`,
    );
}
