import { data as esquemaData } from '@pelada/contrato';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { ErroApi } from '../../dados/erros';
import { useEditarPartida, useExcluirPartida, usePartida } from '../../dados/partida';
import { estadoRetorno } from '../../dados/retorno';
import { dataCompleta, diaMesHora } from '../../formatacao';
import { FormularioPartida, type EnvioPartida } from './FormularioPartida';
import estilos from './partida.module.css';

/** T11 (editar): carrega as presenças da data do caminho, salva por PUT e exclui atrás do D2. */
export function Component() {
  const { grupoId = '', data = '' } = useParams();
  const navegar = useNavigate();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const dataValida = esquemaData.safeParse(data).success;

  const consulta = usePartida(grupoId, data, dataValida);
  const editar = useEditarPartida(grupoId, data);
  const excluir = useExcluirPartida(grupoId, data);
  const [falhouAoSalvar, setFalhouAoSalvar] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [falhouAoExcluir, setFalhouAoExcluir] = useState(false);

  // Data malformada: volta à lista. Partida que não existe (outro admin excluiu): lança nessa data.
  if (!dataValida) return <Navigate to={`${base}/partidas`} replace />;
  if (consulta.error instanceof ErroApi && consulta.error.status === 404) {
    return <Navigate to={`${base}/partidas/nova?data=${data}`} replace />;
  }
  if (consulta.isError) {
    return (
      <>
        <h1 className="sr">Editar partida</h1>
        <ErroRede aoTentar={() => void consulta.refetch()} />
      </>
    );
  }

  const aoSalvar = (envio: EnvioPartida) => {
    setFalhouAoSalvar(false);
    editar.mutate(
      { ...envio, data },
      {
        onSuccess: () => void navegar(base, { state: estadoRetorno({ tipo: 'partida-salva', data }) }),
        onError: () => setFalhouAoSalvar(true),
      },
    );
  };

  const aoExcluir = () => {
    setFalhouAoExcluir(false);
    excluir.mutate(undefined, {
      onSuccess: () =>
        void navegar(`${base}/partidas?mes=${data.slice(0, 7)}`, {
          state: estadoRetorno({ tipo: 'partida-excluida', data }),
        }),
      onError: () => {
        setConfirmandoExclusao(false);
        setFalhouAoExcluir(true);
      },
    });
  };

  const detalhe = consulta.data;
  return (
    <>
      <title>{`Editar partida de ${dataCompleta(data)}`}</title>
      <Voltar para={`${base}/partidas`} rotulo="Partidas" />
      <h1 className={estilos.titulo}>Editar partida</h1>
      {falhouAoExcluir ? <Faixa tipo="erro">Não foi possível excluir a partida. Tente de novo.</Faixa> : null}
      <FormularioPartida
        data={data}
        max={detalhe?.hoje}
        aoMudarData={() => undefined}
        dataSomenteLeitura
        resposta={detalhe}
        carregando={consulta.isPending}
        rotaEditar={(d) => `${base}/partidas/${d}`}
        ajuda={detalhe ? `Última alteração: ${detalhe.alteradaPor}, ${diaMesHora(detalhe.alteradaEm)}` : undefined}
        acoesExtras={
          detalhe ? (
            <Botao variante="textoDestrutivo" onClick={() => setConfirmandoExclusao(true)}>
              Excluir partida
            </Botao>
          ) : undefined
        }
        enviando={editar.isPending}
        falhouAoSalvar={falhouAoSalvar}
        aoSalvar={aoSalvar}
      />
      {confirmandoExclusao ? (
        <DialogoConfirmacao
          {...textosConfirmacao.excluirPartida(data)}
          carregando={excluir.isPending}
          aoConfirmar={aoExcluir}
          aoCancelar={() => setConfirmandoExclusao(false)}
        />
      ) : null}
    </>
  );
}
