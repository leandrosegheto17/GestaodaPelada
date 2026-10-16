import { projecaoPdf, type ProjecaoPdf } from '@pelada/contrato';
import { calcularPdf, limitesDeMes } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import type { Grupo } from '../../infraestrutura/db/repositorios/grupos.js';
import { urlPublicaDoGrupo } from '../grupos/url-publica.js';
import { carregarHistoricoGrupo } from '../pontuacao/historico.js';
import { linhasPublicas, mesNoHistorico } from './ranking.js';

export type ResultadoPdf = { tipo: 'ok'; pdf: ProjecaoPdf } | { tipo: 'fora_dos_limites' };

/**
 * Dados do PDF do mês na projeção pública estrita (campo a campo; nenhum id sai). O desenho do PDF é do
 * navegador: o servidor só entrega as colunas e as linhas que o domínio escolheu.
 */
export async function montarProjecaoPdf(
  ex: ExecutorDb,
  grupo: Grupo,
  contexto: { hoje: string; mes: string; agora: Date; urlPublica: string },
): Promise<ResultadoPdf> {
  const historico = await carregarHistoricoGrupo(ex, grupo.id, contexto.hoje);
  if (!mesNoHistorico(limitesDeMes(historico.partidas, contexto.hoje), contexto.mes, contexto.hoje)) {
    return { tipo: 'fora_dos_limites' };
  }
  const pdf = calcularPdf({ hoje: contexto.hoje, mes: contexto.mes, ...historico });
  return {
    tipo: 'ok',
    pdf: projecaoPdf.parse({
      grupo: { nome: grupo.nome, slug: grupo.slug },
      mes: contexto.mes,
      geradoEm: contexto.agora.toISOString(),
      urlPublica: urlPublicaDoGrupo(contexto.urlPublica, grupo.slug),
      semPartidasNoMes: pdf.semPartidasNoMes,
      colunas: pdf.colunas.map((c) => ({ data: c.data, choveu: c.choveu, doMesExibido: c.doMesExibido })),
      linhas: linhasPublicas(pdf.linhas),
    }),
  };
}
