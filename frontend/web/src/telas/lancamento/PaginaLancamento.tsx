import type { LancamentoCorpo } from '@pelada/contrato';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { useGrupo } from '../../dados/grupo';
import { useCriarLancamento, useEditarLancamento, useExcluirLancamento, useLancamento } from '../../dados/lancamentos';
import { diaMesHora } from '../../formatacao';
import { FormularioLancamento } from './FormularioLancamento';
import estilos from './lancamento.module.css';

const FORMA_DO_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** T23: lançamento novo (`financeiro/lancamentos/novo`) e edição (`financeiro/lancamentos/:lancamentoId`). */
export function Component() {
  const { grupoId = '', lancamentoId } = useParams();
  const navegar = useNavigate();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const novo = lancamentoId === undefined;
  const idValido = novo || FORMA_DO_ID.test(lancamentoId);

  const grupo = useGrupo(grupoId);
  const ficha = useLancamento(grupoId, lancamentoId ?? '', !novo && idValido);
  const criar = useCriarLancamento(grupoId);
  const editar = useEditarLancamento(grupoId, lancamentoId ?? '');
  const excluir = useExcluirLancamento(grupoId, lancamentoId ?? '');

  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [falhaAoExcluir, setFalhaAoExcluir] = useState<string | null>(null);

  const financeiro = `${base}/financeiro`;
  const noMes = (data: string) => `${financeiro}?mes=${data.slice(0, 7)}`;

  // Id malformado ou lançamento que sumiu (outro admin excluiu): volta ao caixa, sem alarde.
  if (!idValido || (ficha.error instanceof ErroApi && ficha.error.status === 404)) {
    return <Navigate to={financeiro} replace />;
  }
  if (ficha.isError || grupo.isError) {
    return (
      <>
        <h1 className="sr">Lançamento</h1>
        <ErroRede
          aoTentar={() => {
            void ficha.refetch();
            void grupo.refetch();
          }}
        />
      </>
    );
  }
  const lancamento = ficha.data;
  const hoje = grupo.data?.hoje;
  if (!hoje || (!novo && !lancamento)) {
    return (
      <>
        <TituloPagina>{novo ? 'Novo lançamento' : 'Editar lançamento'}</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="linha" quantidade={4} />
      </>
    );
  }

  const aoSalvar = (corpo: LancamentoCorpo) => {
    setSemConexao(false);
    setErrosDoServidor({});
    const aoErro = (erro: unknown) => {
      const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
      if (doCampo) setErrosDoServidor(doCampo);
      else setSemConexao(true);
    };
    const aoSucesso = () => void navegar(noMes(corpo.data));
    if (novo) criar.mutate(corpo, { onSuccess: aoSucesso, onError: aoErro });
    else editar.mutate(corpo, { onSuccess: aoSucesso, onError: aoErro });
  };

  const aoExcluir = () => {
    excluir.mutate(undefined, {
      onSuccess: () => void navegar(noMes(lancamento?.data ?? hoje)),
      onError: (erro) => {
        setExcluindo(false);
        setFalhaAoExcluir(
          erro instanceof ErroApi && erro.codigo === 'lancamento_vinculado'
            ? erro.message
            : 'Não foi possível excluir o lançamento. Tente de novo.',
        );
      },
    });
  };

  return (
    <div className={estilos.estreito}>
      <title>{novo ? 'Novo lançamento' : 'Editar lançamento'}</title>
      <Voltar para={financeiro} rotulo="Financeiro" />
      <TituloPagina>{novo ? 'Novo lançamento' : 'Editar lançamento'}</TituloPagina>
      {falhaAoExcluir ? (
        <Faixa tipo="erro" aoFechar={() => setFalhaAoExcluir(null)} rotuloFechar="Fechar aviso">
          {falhaAoExcluir}
        </Faixa>
      ) : null}
      {lancamento ? (
        <p className={estilos.ajuda}>
          Última alteração: {lancamento.alteradoPor}, {diaMesHora(lancamento.alteradoEm)}
        </p>
      ) : null}
      <FormularioLancamento
        key={lancamento ? lancamento.id : 'novo'}
        inicial={
          lancamento
            ? {
                tipo: lancamento.tipo,
                data: lancamento.data,
                descricao: lancamento.descricao,
                valorCentavos: lancamento.valorCentavos,
              }
            : undefined
        }
        hoje={hoje}
        errosDoServidor={errosDoServidor}
        enviando={criar.isPending || editar.isPending}
        semConexao={semConexao}
        aoSalvar={aoSalvar}
        acoesExtras={
          lancamento ? (
            <Botao variante="textoDestrutivo" onClick={() => setExcluindo(true)}>
              Excluir
            </Botao>
          ) : null
        }
      />
      {excluindo && lancamento ? (
        <DialogoConfirmacao
          {...textosConfirmacao.excluirLancamento(lancamento.descricao, lancamento.valorCentavos)}
          carregando={excluir.isPending}
          aoConfirmar={aoExcluir}
          aoCancelar={() => setExcluindo(false)}
        />
      ) : null}
    </div>
  );
}
