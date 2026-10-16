import { data as esquemaData, erroPartidaDuplicada } from '@pelada/contrato';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { ErroApi } from '../../dados/erros';
import { useGrupo } from '../../dados/grupo';
import { usePartidaNova, useSalvarPartida } from '../../dados/partida';
import { estadoRetorno } from '../../dados/retorno';
import { diaMes } from '../../formatacao';
import { FormularioPartida, type EnvioPartida } from './FormularioPartida';
import estilos from './partida.module.css';

/** Texto de erro da data a partir do 422 da API. */
function erroDaData(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.status === 422 ? erro.campos?.data : undefined;
}

/** Data da partida que já existe, a partir do 409 `partida_ja_existe`. */
function dataDuplicada(erro: unknown): string | undefined {
  if (!(erro instanceof ErroApi) || erro.status !== 409) return undefined;
  const analise = erroPartidaDuplicada.safeParse({
    erro: { codigo: erro.codigo, mensagem: erro.message, ...erro.extras },
  });
  return analise.success ? analise.data.erro.dataExistente : undefined;
}

/** T11 (nova): jogadores ativos da data, marcações locais e envio. */
export function Component() {
  const { grupoId = '' } = useParams();
  const [parametros, definirParametros] = useSearchParams();
  const navegar = useNavigate();
  const grupo = useGrupo(grupoId);

  const dataDaUrl = parametros.get('data');
  const dataPedida = dataDaUrl !== null && esquemaData.safeParse(dataDaUrl).success ? dataDaUrl : undefined;
  const consulta = usePartidaNova(grupoId, dataPedida);
  const salvar = useSalvarPartida(grupoId);
  const [falhouAoSalvar, setFalhouAoSalvar] = useState(false);
  const [erroNoEnvio, setErroNoEnvio] = useState<unknown>(null);

  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const resposta = consulta.data;
  const erroConsulta = consulta.error;

  if (consulta.isError && erroDaData(erroConsulta) === undefined) {
    return (
      <>
        <h1 className="sr">Lançar partida</h1>
        <ErroRede aoTentar={() => void consulta.refetch()} />
      </>
    );
  }

  // Erros da data vêm da consulta (data futura) ou do envio (422 de data, 409 de duplicada).
  const erroData = erroDaData(erroConsulta) ?? erroDaData(erroNoEnvio);
  const dataExistente = dataDuplicada(erroNoEnvio) ?? (resposta?.jaExiste ? resposta.data : undefined);
  const textoDuplicada = dataExistente
    ? erroNoEnvio instanceof ErroApi && erroNoEnvio.status === 409
      ? erroNoEnvio.message
      : `Já existe uma partida em ${dataExistente.split('-').reverse().join('/')}.`
    : undefined;

  const aoSalvar = (envio: EnvioPartida) => {
    setFalhouAoSalvar(false);
    setErroNoEnvio(null);
    salvar.mutate(envio, {
      onSuccess: () => {
        void navegar(base, { state: estadoRetorno({ tipo: 'partida-salva', data: envio.data }) });
      },
      onError: (erro) => {
        if (erroDaData(erro) !== undefined || dataDuplicada(erro) !== undefined) setErroNoEnvio(erro);
        else setFalhouAoSalvar(true);
      },
    });
  };

  const aviso =
    resposta?.preMarcadaPelaEscalacao && !dataExistente ? (
      <Faixa tipo="info" papel="note">
        Pré-marcado pela escalação de {diaMes(resposta.data)} (inclui quem ficou como {'“'}não entra{'”'}).
      </Faixa>
    ) : null;

  return (
    <>
      <title>Lançar partida</title>
      <Voltar para={base} rotulo="Início" />
      <h1 className={estilos.titulo}>Lançar partida</h1>
      <FormularioPartida
        data={dataPedida ?? resposta?.data ?? ''}
        max={resposta?.hoje ?? grupo.data?.hoje}
        aoMudarData={(nova) => {
          if (!esquemaData.safeParse(nova).success) return;
          setErroNoEnvio(null);
          setFalhouAoSalvar(false);
          definirParametros({ data: nova }, { replace: true });
        }}
        resposta={resposta && !erroData ? resposta : undefined}
        carregando={consulta.isPending}
        erroData={erroData ?? textoDuplicada}
        dataExistente={dataExistente}
        rotaEditar={(d) => `${base}/partidas/${d}`}
        aviso={aviso}
        enviando={salvar.isPending}
        falhouAoSalvar={falhouAoSalvar}
        aoSalvar={aoSalvar}
      />
    </>
  );
}
