import type { GrupoDetalhe } from '@pelada/contrato';
import { dataCompleta, formatarMoeda, nomeMes } from '../../formatacao';
import { descreverAgenda } from '../../formatacao/agenda';

export interface SecaoDoGrupo {
  id: string;
  titulo: string;
  /** Trecho do caminho depois de `/admin/<grupo>/`. */
  rota: string;
  meta: string;
}

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

interface Entrada {
  detalhe: GrupoDetalhe;
  /** Financeiro entra na lista (permissão da pessoa e recurso ligado). */
  comFinanceiro: boolean;
}

/** As seções de "Gerenciar", com a meta de cada uma. Só formata o que a API devolveu. */
export function secoesDoGrupo({ detalhe, comFinanceiro }: Entrada): SecaoDoGrupo[] {
  const { grupo, inicio, hoje } = detalhe;
  const mes = nomeMes(hoje.slice(0, 7));
  const secoes: SecaoDoGrupo[] = [
    {
      id: 'partidas',
      titulo: 'Partidas',
      rota: 'partidas',
      meta: inicio.partidasNoMes === 0 ? `Nenhuma em ${mes}` : `${inicio.partidasNoMes} em ${mes}`,
    },
    {
      id: 'jogadores',
      titulo: 'Jogadores',
      rota: 'jogadores',
      meta: inicio.jogadoresAtivos === 0 ? 'Nenhum cadastrado' : plural(inicio.jogadoresAtivos, 'ativo', 'ativos'),
    },
    {
      id: 'habilidades',
      titulo: 'Habilidades',
      rota: 'habilidades',
      meta: inicio.habilidades === 0 ? 'Nenhuma habilidade' : plural(inicio.habilidades, 'habilidade', 'habilidades'),
    },
    {
      id: 'pontuacao',
      titulo: 'Pontuação',
      rota: 'pontuacao',
      meta: inicio.pesosPadrao ? 'Pesos padrão' : `Vigente desde ${dataCompleta(inicio.pesosVigentesDesde)}`,
    },
    { id: 'admins', titulo: 'Admins', rota: 'admins', meta: plural(inicio.admins, 'admin', 'admins') },
    {
      id: 'grupo',
      titulo: 'Dados do grupo',
      rota: 'grupo',
      meta: `${descreverAgenda(grupo)} · link do ranking`,
    },
    {
      id: 'uso',
      titulo: 'Uso do app',
      rota: 'uso',
      meta:
        inicio.aparelhosNaSemana === 0
          ? 'Sem uso registrado'
          : `Esta semana: ${plural(inicio.aparelhosNaSemana, 'aparelho', 'aparelhos')}`,
    },
  ];
  if (comFinanceiro) {
    secoes.push({
      id: 'financeiro',
      titulo: 'Financeiro',
      rota: 'financeiro',
      meta:
        inicio.saldoAtualCentavos == null
          ? 'Caixa não configurado'
          : `Saldo ${formatarMoeda(inicio.saldoAtualCentavos)}`,
    });
  }
  return secoes;
}
