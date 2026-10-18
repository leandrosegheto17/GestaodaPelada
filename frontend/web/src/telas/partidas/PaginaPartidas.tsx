import { useLocation, useParams } from 'react-router';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TituloPagina } from '../../componentes/pagina';
import { Lista } from '../../componentes/listas/Lista';
import { NavegadorMes } from '../../componentes/listas/NavegadorMes';
import { useGrupo } from '../../dados/grupo';
import { usePartidasDoMes } from '../../dados/partidas-mes';
import { lerRetorno } from '../../dados/retorno';
import { useMesDaUrl } from '../../dados/useMesDaUrl';
import { diaMes } from '../../formatacao';
import { EsqueletoPartidas } from './EsqueletoPartidas';
import { ItemPartida } from './ItemPartida';
import estilos from './partidas.module.css';

/** T10: partidas do mês do grupo. O mês corrente vem do `hoje` da API (via grupo), nunca do aparelho. */
export function Component() {
  const { grupoId = '' } = useParams();
  const grupo = useGrupo(grupoId);
  const retorno = lerRetorno(useLocation().state);

  const { mesDaUrl, mesValido, definirMes } = useMesDaUrl();
  const mes = mesValido ? (mesDaUrl ?? grupo.data?.hoje.slice(0, 7)) : undefined;
  const partidas = usePartidasDoMes(grupoId, mes);

  if (grupo.isError || partidas.isError) {
    return (
      <>
        <TituloPagina>Partidas</TituloPagina>
        <ErroRede
          aoTentar={() => {
            void grupo.refetch();
            void partidas.refetch();
          }}
        />
      </>
    );
  }
  if (!partidas.data || !grupo.data) return <EsqueletoPartidas />;

  const { data } = partidas;
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  return (
    <>
      <title>{`Partidas: ${grupo.data.grupo.nome}`}</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Partidas</TituloPagina>
      {retorno?.tipo === 'partida-excluida' ? (
        <Faixa tipo="sucesso">Partida de {diaMes(retorno.data)} excluída.</Faixa>
      ) : null}
      <div className={estilos.ferramentas}>
        <NavegadorMes
          mes={data.mes}
          mesAnterior={data.navegacao.mesAnterior}
          mesSeguinte={data.navegacao.mesSeguinte}
          aoTrocar={definirMes}
        />
      </div>
      {data.partidas.length > 0 ? (
        <Lista>
          {data.partidas.map((p) => (
            <ItemPartida key={p.data} grupoId={grupoId} partida={p} />
          ))}
        </Lista>
      ) : (
        <EstadoVazio icone={null} titulo="Nenhuma partida neste mês." />
      )}
      <BarraAcao>
        <BotaoLink to={`${base}/partidas/nova`}>Nova partida</BotaoLink>
      </BarraAcao>
    </>
  );
}
