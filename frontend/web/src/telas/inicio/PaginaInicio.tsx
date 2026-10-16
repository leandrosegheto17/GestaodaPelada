import { useLocation, useParams, useSearchParams } from 'react-router';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Faixa } from '../../componentes/basicos/Faixa';
import { recursos } from '../../config/recursos';
import { useGrupo } from '../../dados/grupo';
import { lerRetorno, type Retorno } from '../../dados/retorno';
import { diaMes } from '../../formatacao';
import { DiaDeJogo } from './DiaDeJogo';
import { EsqueletoInicio } from './EsqueletoInicio';
import { secoesDoGrupo } from './metasSecoes';
import { SecoesGrupo } from './SecoesGrupo';

const TEXTO_RETORNO: Record<Retorno['tipo'], (data: string) => string> = {
  'partida-salva': (data) => `Partida de ${diaMes(data)} salva.`,
  'escalacao-confirmada': (data) => `Escalação de ${diaMes(data)} confirmada.`,
};

/** T09: início do admin de um grupo. Rota filha do `LayoutAdmin`, que já traz barra e menu. */
export function Component() {
  const { grupoId = '' } = useParams();
  const [parametros] = useSearchParams();
  const { state } = useLocation();
  const grupo = useGrupo(grupoId);
  const retorno = lerRetorno(state);

  if (grupo.isPending) return <EsqueletoInicio />;
  if (grupo.isError) {
    return (
      <>
        <h1 className="sr">Início do admin</h1>
        <ErroRede aoTentar={() => void grupo.refetch()} />
      </>
    );
  }

  const detalhe = grupo.data;
  const comFinanceiro = detalhe.permissoes.acessaFinanceiro && recursos.ligado('financeiro');
  return (
    <>
      <title>{`Início: ${detalhe.grupo.nome}`}</title>
      <h1 className="sr">Início do admin: {detalhe.grupo.nome}</h1>
      {parametros.get('negado') === 'financeiro' ? (
        <Faixa tipo="atencao" papel="alert">
          Você não tem acesso ao financeiro deste grupo.
        </Faixa>
      ) : null}
      {retorno ? (
        <Faixa
          tipo="sucesso"
          acao={
            <BotaoLink to={`/g/${detalhe.grupo.slug}`} variante="texto">
              Ver ranking
            </BotaoLink>
          }
        >
          {TEXTO_RETORNO[retorno.tipo](retorno.data)}
        </Faixa>
      ) : null}
      <DiaDeJogo grupoId={grupoId} inicio={detalhe.inicio} />
      <SecoesGrupo grupoId={grupoId} secoes={secoesDoGrupo({ detalhe, comFinanceiro })} />
    </>
  );
}
