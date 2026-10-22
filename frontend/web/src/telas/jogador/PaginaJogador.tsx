import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import {
  useCriarJogador,
  useEditarJogador,
  useExcluirJogador,
  useInativarJogador,
  useJogador,
  type CorpoJogador,
} from '../../dados/elenco';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { useGrupo } from '../../dados/grupo';
import { recursos } from '../../config/recursos';
import { DialogoInativar } from './DialogoInativar';
import { DialogoInicio } from './DialogoInicio';
import { FaixasDaFicha, type FaixaDeDatas } from './FaixasDaFicha';
import { FormularioJogador } from './FormularioJogador';
import { SecaoNotas } from './SecaoNotas';
import { SecaoSituacao } from './SecaoSituacao';
import estilos from './jogador.module.css';

/** T16: cadastro (`jogadores/novo`) e ficha (`jogadores/:jogadorId`) do jogador. */
export function Component() {
  const { grupoId = '', jogadorId } = useParams();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const novo = jogadorId === undefined;

  const grupo = useGrupo(grupoId);
  const ficha = useJogador(grupoId, jogadorId ?? '', !novo);
  const criar = useCriarJogador(grupoId);
  const editar = useEditarJogador(grupoId, jogadorId ?? '');
  const inativar = useInativarJogador(grupoId, jogadorId ?? '');
  const excluir = useExcluirJogador(grupoId, jogadorId ?? '');

  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [salvoNaFicha, setSalvo] = useState(false);
  const salvo = salvoNaFicha || (localizacao.state as { salvo?: boolean } | null)?.salvo === true;
  const [dialogo, setDialogo] = useState<'inativar' | 'excluir' | 'inicio' | null>(null);
  const [inicioAlterado, setInicioAlterado] = useState(false);
  const [datas, setDatas] = useState<FaixaDeDatas | null>(null);
  const [recusadaPorHistorico, setRecusadaPorHistorico] = useState<string | null>(null);
  const [falhaNaSituacao, setFalhaNaSituacao] = useState(false);

  if (!novo && ficha.error instanceof ErroApi && ficha.error.status === 404) {
    return <Navigate to={`${base}/jogadores`} replace />;
  }
  if (ficha.isError || grupo.isError) {
    return (
      <>
        <h1 className="sr">Jogador</h1>
        <ErroRede
          aoTentar={() => {
            void ficha.refetch();
            void grupo.refetch();
          }}
        />
      </>
    );
  }
  const jogador = ficha.data;
  const hoje = grupo.data?.hoje;
  if (!hoje || (!novo && !jogador)) {
    return (
      <>
        <TituloPagina>{novo ? 'Novo jogador' : 'Jogador'}</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="linha" quantidade={6} />
      </>
    );
  }

  const aoSalvar = (corpo: CorpoJogador) => {
    setSalvo(false);
    setInicioAlterado(false);
    setSemConexao(false);
    setErrosDoServidor({});
    const aoErro = (erro: unknown) => {
      const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
      if (doCampo) setErrosDoServidor(doCampo);
      else setSemConexao(true);
    };
    if (novo) {
      criar.mutate(corpo, {
        onSuccess: (criado) =>
          void navegar(`${base}/jogadores/${encodeURIComponent(criado.id)}`, { replace: true, state: { salvo: true } }),
        onError: aoErro,
      });
    } else {
      editar.mutate(corpo, { onSuccess: () => setSalvo(true), onError: aoErro });
    }
  };

  const aoInativar = (dataSaida: string) => {
    inativar.mutate({ dataSaida }, { onSuccess: () => setDialogo(null) });
  };

  const aoExcluir = () => {
    excluir.mutate(undefined, {
      onSuccess: () => void navegar(`${base}/jogadores`),
      onError: (erro) => {
        setDialogo(null);
        if (erro instanceof ErroApi && erro.codigo === 'jogador_com_historico') setRecusadaPorHistorico(erro.message);
        else setFalhaNaSituacao(true);
      },
    });
  };

  return (
    <div className={estilos.estreito}>
      <title>{novo ? 'Novo jogador' : (jogador?.apelido ?? 'Jogador')}</title>
      <Voltar para={`${base}/jogadores`} rotulo="Jogadores" />
      <TituloPagina>{novo ? 'Novo jogador' : (jogador?.apelido ?? '')}</TituloPagina>
      <FaixasDaFicha
        datas={datas}
        salvo={salvo}
        inicioAlterado={inicioAlterado}
        recusadaPorHistorico={recusadaPorHistorico}
        falhaNaSituacao={falhaNaSituacao}
        aoInativarEmVezDeExcluir={() => setDialogo('inativar')}
      />
      <section aria-labelledby={novo ? undefined : 's-dados'}>
        {novo ? null : (
          <h2 id="s-dados" className={estilos.subtitulo}>
            Dados
          </h2>
        )}
        <FormularioJogador
          key={jogador ? jogador.id : 'novo'}
          jogador={jogador}
          hoje={hoje}
          aoAlterarInicio={() => setDialogo('inicio')}
          errosDoServidor={errosDoServidor}
          enviando={criar.isPending || editar.isPending}
          semConexao={semConexao}
          aoSalvar={aoSalvar}
        />
      </section>
      {jogador && recursos.ligado('simulador') ? <SecaoNotas grupoId={grupoId} jogador={jogador} /> : null}
      {jogador ? (
        <SecaoSituacao
          grupoId={grupoId}
          jogador={jogador}
          aoDatas={setDatas}
          aoInativar={() => setDialogo('inativar')}
          aoExcluir={() => setDialogo('excluir')}
        />
      ) : null}
      {dialogo === 'inativar' && jogador ? (
        <DialogoInativar
          apelido={jogador.apelido}
          hoje={hoje}
          enviando={inativar.isPending}
          erro={inativar.error}
          aoInativar={aoInativar}
          aoCancelar={() => {
            inativar.reset();
            setDialogo(null);
          }}
        />
      ) : null}
      {dialogo === 'inicio' && jogador ? (
        <DialogoInicio
          grupoId={grupoId}
          jogadorId={jogador.id}
          hoje={hoje}
          atual={jogador.inicioPontuacao}
          aoCancelar={() => setDialogo(null)}
          aoAlterado={() => {
            setDialogo(null);
            setSalvo(false);
            setInicioAlterado(true);
          }}
        />
      ) : null}
      {dialogo === 'excluir' && jogador ? (
        <DialogoConfirmacao
          {...textosConfirmacao.excluirJogador(jogador.apelido)}
          carregando={excluir.isPending}
          aoConfirmar={aoExcluir}
          aoCancelar={() => setDialogo(null)}
        />
      ) : null}
    </div>
  );
}
