import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CampoBusca } from '../../componentes/campos/CampoBusca';
import { Segmentado } from '../../componentes/escolhas/Segmentado';
import { Lista } from '../../componentes/listas/Lista';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useJogadores } from '../../dados/elenco';
import { filtrarPorBusca, lerFiltro, type FiltroJogadores } from './filtroJogadores';
import { ItemJogador } from './ItemJogador';
import estilos from './jogadores.module.css';

/** T15: jogadores do grupo, com filtro Ativos/Inativos (`?filtro=`) e busca local. */
export function Component() {
  const { grupoId = '' } = useParams();
  const [parametros, definirParametros] = useSearchParams();
  const filtro = lerFiltro(parametros);
  const [busca, setBusca] = useState('');
  const jogadores = useJogadores(grupoId);

  if (jogadores.isError) {
    return (
      <>
        <h1 className="sr">Jogadores</h1>
        <ErroRede aoTentar={() => void jogadores.refetch()} />
      </>
    );
  }
  if (!jogadores.data) {
    return (
      <>
        <TituloPagina>Jogadores</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={6} />
      </>
    );
  }

  const { ativos, inativos } = jogadores.data;
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const itens = filtro === 'ativos' ? ativos : inativos;
  const visiveis = filtrarPorBusca(itens, busca);
  const semNenhumAtivo = filtro === 'ativos' && ativos.length === 0;
  return (
    <>
      <title>Jogadores</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Jogadores</TituloPagina>
      <Segmentado<FiltroJogadores>
        legenda="Mostrar"
        valor={filtro}
        aoMudar={(novo) => {
          setBusca('');
          definirParametros({ filtro: novo }, { replace: true });
        }}
        opcoes={[
          { valor: 'ativos', rotulo: `Ativos (${ativos.length})` },
          { valor: 'inativos', rotulo: `Inativos (${inativos.length})` },
        ]}
      />
      {itens.length === 0 ? (
        <div className={estilos.acima4}>
          <EstadoVazio
            icone={null}
            titulo={filtro === 'ativos' ? 'Nenhum jogador cadastrado.' : 'Nenhum jogador inativo.'}
            acao={semNenhumAtivo ? <BotaoLink to={`${base}/jogadores/novo`}>Novo jogador</BotaoLink> : undefined}
          />
        </div>
      ) : (
        <>
          <div className={estilos.busca}>
            <CampoBusca rotulo="Buscar jogador" valor={busca} aoMudar={setBusca} />
          </div>
          {visiveis.length > 0 ? (
            <Lista>
              {visiveis.map((jogador) => (
                <ItemJogador key={jogador.id} grupoId={grupoId} jogador={jogador} />
              ))}
            </Lista>
          ) : (
            <EstadoVazio icone={null} titulo="Nenhum jogador encontrado." />
          )}
        </>
      )}
      {semNenhumAtivo ? null : (
        <BarraAcao>
          <BotaoLink to={`${base}/jogadores/novo`}>Novo jogador</BotaoLink>
        </BarraAcao>
      )}
    </>
  );
}
