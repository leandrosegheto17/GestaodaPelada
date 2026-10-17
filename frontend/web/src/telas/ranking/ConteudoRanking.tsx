import type { RankingPublico } from '@pelada/contrato';
import { Link } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Icone } from '../../componentes/basicos/Icone';
import { NavegadorMes } from '../../componentes/listas/NavegadorMes';
import { Legenda } from '../../componentes/tabela-ranking/Legenda';
import { TabelaRanking } from '../../componentes/tabela-ranking/TabelaRanking';
import { recursos } from '../../config/recursos';
import { ResumoMes } from './ResumoMes';
import estilos from './ranking.module.css';

interface Props {
  ranking: RankingPublico;
  aoTrocarMes: (mes: string) => void;
  atualizando?: boolean;
  /** Exportar PDF: o botão do topo (PC) aparece quando há `aoExportar`. */
  exportar?: { preparando: boolean; aoExportar: () => void };
}

/** Miolo da T01: mês, resumo, tabela, legenda e rodapé. Só exibe o que a API devolveu. */
export function ConteudoRanking({ ranking, aoTrocarMes, atualizando = false, exportar }: Props) {
  const temJogadores = ranking.linhas.length > 0;
  return (
    <>
      <div className={estilos.ferramentas}>
        <NavegadorMes
          mes={ranking.mes}
          mesAnterior={ranking.navegacao.mesAnterior}
          mesSeguinte={ranking.navegacao.mesSeguinte}
          aoTrocar={aoTrocarMes}
        />
        {temJogadores && recursos.ligado('pdf') ? (
          <span className={estilos.exportarTopo}>
            <Botao
              carregando={exportar?.preparando ?? false}
              rotuloCarregando="Preparando PDF…"
              onClick={exportar?.aoExportar}
            >
              <Icone nome="exportar" />
              Exportar PDF
            </Botao>
          </span>
        ) : null}
      </div>
      {temJogadores ? (
        <>
          <ResumoMes
            partidas={ranking.resumoMes.partidas}
            comChuva={ranking.resumoMes.comChuva}
            atualizando={atualizando}
          />
          <TabelaRanking ranking={ranking} />
          {ranking.partidas.length > 0 ? <Legenda /> : null}
        </>
      ) : (
        <EstadoVazio
          icone="bola"
          titulo="Nenhum jogador no ranking ainda."
          texto="Quando o admin cadastrar os jogadores, o ranking aparece aqui."
        />
      )}
      <footer className={estilos.rodape}>
        {recursos.ligado('privacidade') ? (
          <>
            <Link to="/privacidade">Privacidade</Link> ·{' '}
          </>
        ) : null}
        Gestão da Pelada
      </footer>
    </>
  );
}
