import type { RankingPublico } from '@pelada/contrato';
import { AvisoEnderecoNovo } from '../../componentes/aviso-endereco-novo';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BarraSuperior } from '../../componentes/barras/BarraSuperior';
import { PularConteudo } from '../../componentes/barras/PularConteudo';
import { Botao } from '../../componentes/basicos/Botao';
import { Icone } from '../../componentes/basicos/Icone';
import { recursos } from '../../config/recursos';
import { descreverAgenda } from '../../formatacao/agenda';
import { ConteudoRanking } from './ConteudoRanking';
import estilos from './ranking.module.css';

interface Props {
  ranking: RankingPublico;
  aoTrocarMes: (mes: string) => void;
}

/** T01 com dados: barra do grupo, aviso de endereço novo, conteúdo e ação de exportar no celular. */
export function TelaRanking({ ranking, aoTrocarMes }: Props) {
  const { grupo } = ranking;
  const exportar = ranking.linhas.length > 0 && recursos.ligado('pdf');
  return (
    <>
      <title>{`Ranking: ${grupo.nome}`}</title>
      <PularConteudo texto="Pular para o ranking" />
      <BarraSuperior
        titulo={grupo.nome}
        subtitulo={descreverAgenda(grupo)}
        destinoAdmin={`/admin?grupo=${encodeURIComponent(grupo.slug)}`}
        destinoFinanceiro={`/admin?grupo=${encodeURIComponent(grupo.slug)}&area=financeiro`}
      />
      <AvisoEnderecoNovo enderecoNovo={ranking.enderecoNovo} />
      <main id="conteudo" tabIndex={-1} className={estilos.conteudo}>
        <ConteudoRanking ranking={ranking} aoTrocarMes={aoTrocarMes} />
      </main>
      {exportar ? (
        <BarraAcao soCelular>
          <Botao bloco>
            <Icone nome="exportar" />
            Exportar PDF
          </Botao>
        </BarraAcao>
      ) : null}
    </>
  );
}
