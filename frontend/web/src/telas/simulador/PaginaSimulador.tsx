import { useMemo, useReducer } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useContextoSimulador, usePrevia } from '../../dados/simulador';
import { usarValorAtrasado } from '../../dados/usarValorAtrasado';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CartaoPrevia, ID_RAZAO, razaoDoBloqueio, type SituacaoPrevia } from './CartaoPrevia';
import { ESTADO_INICIAL, estadoDeEntrada, idsMarcados, paraEntrada, paraPrevia, reduzir } from './estadoEntradas';
import { FormEntradas } from './FormEntradas';
import { ListaAptos } from './ListaAptos';
import { entradaDoEstado, erroDoEstado } from './navegacao';
import estilos from './simulador.module.css';

const ATRASO_DA_PREVIA_MS = 300;

/** T12: entradas do simulador e prévia de quantos times saem. */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const navegar = useNavigate();
  const { state } = useLocation();
  const erroAnterior = erroDoEstado(state);
  const [estado, despachar] = useReducer(reduzir, undefined, () => {
    const anterior = entradaDoEstado(state);
    return anterior ? estadoDeEntrada(anterior) : ESTADO_INICIAL;
  });

  const contexto = useContextoSimulador(grupoId, estado.data);
  const jogadores = useMemo(() => contexto.data?.jogadores ?? [], [contexto.data]);
  const todos = useMemo(() => jogadores.map((j) => j.id), [jogadores]);
  const data = estado.data ?? contexto.data?.dataSugerida ?? '';
  const marcados = useMemo(() => new Set(idsMarcados(estado, todos)), [estado, todos]);

  const entrada = useMemo(() => (data ? paraEntrada(estado, todos, data) : null), [estado, todos, data]);
  const pedidoDaPrevia = useMemo(() => (entrada ? paraPrevia(entrada) : null), [entrada]);
  const pedidoAtrasado = usarValorAtrasado(pedidoDaPrevia, ATRASO_DA_PREVIA_MS);
  const previa = usePrevia(grupoId, pedidoAtrasado);

  if (contexto.isError && !contexto.data) {
    return (
      <>
        <h1 className="sr">Simulador</h1>
        <ErroRede aoTentar={() => void contexto.refetch()} />
      </>
    );
  }
  if (!contexto.data) {
    return (
      <>
        <TituloPagina>Simulador</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={3} />
      </>
    );
  }
  if (jogadores.length === 0 && estado.data === null) {
    return (
      <div className={estilos.estreito}>
        <title>Simulador</title>
        <Voltar para={base} rotulo="Início" />
        <TituloPagina>Simulador</TituloPagina>
        <EstadoVazio
          icone={null}
          titulo="Sem jogadores"
          texto="Cadastre jogadores para usar o simulador."
          acao={
            <BotaoLink to={`${base}/jogadores/novo`} variante="principal">
              Cadastrar jogadores
            </BotaoLink>
          }
        />
      </div>
    );
  }

  const aguardando = pedidoAtrasado !== pedidoDaPrevia;
  const situacao: SituacaoPrevia = (() => {
    if (entrada === null) return { tipo: 'sem-aptos' };
    if (aguardando || previa.isFetching) return { tipo: 'calculando' };
    if (previa.isError) return { tipo: 'falha', aoTentar: () => void previa.refetch() };
    return previa.data ? { tipo: 'pronta', previa: previa.data } : { tipo: 'calculando' };
  })();
  const razao = razaoDoBloqueio(situacao);
  const bloqueado = situacao.tipo !== 'pronta' || razao !== null;

  return (
    <div>
      <title>Simulador</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Simulador</TituloPagina>
      {erroAnterior ? <Faixa tipo="erro">{erroAnterior}</Faixa> : null}
      <form
        noValidate
        className={estilos.ladoALado}
        onSubmit={(e) => {
          e.preventDefault();
          if (entrada && !bloqueado) void navegar(`${base}/simulador/resultado`, { state: { entrada } });
        }}
      >
        <div className={estilos.formulario}>
          <FormEntradas estado={estado} data={data} dataSugerida={contexto.data.dataSugerida} despachar={despachar} />
          <CartaoPrevia situacao={situacao} />
        </div>
        <ListaAptos jogadores={jogadores} estado={estado} marcados={marcados} despachar={despachar} />
        <BarraAcao>
          <Botao
            type="submit"
            variante="principal"
            disabled={bloqueado}
            aria-describedby={razao ? ID_RAZAO : undefined}
          >
            Sugerir times
          </Botao>
        </BarraAcao>
      </form>
    </div>
  );
}
