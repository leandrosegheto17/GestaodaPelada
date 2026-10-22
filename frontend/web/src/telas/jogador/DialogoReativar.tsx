import { reativarCorpoComHoje, type PeriodoPreviaResposta } from '@pelada/contrato';
import { useEffect, useId, useMemo, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CampoData } from '../../componentes/campos/CampoData';
import { Dialogo } from '../../componentes/dialogos/Dialogo';
import { PreviaPeriodos, type EstadoPrevia } from '../../componentes/previa-periodos';
import { caminhoJogador, usePeriodos, useReativarJogador } from '../../dados/elenco';
import { deValidacao, ehFalhaDeRede, ehNaoEncontrado, mensagemDoCampo } from '../../dados/errosDeCampos';
import { usePreviaPeriodos } from '../../dados/periodos';
import { dataCompleta } from '../../formatacao';

interface CorpoReativar {
  dataRetorno: string;
}

interface Props {
  grupoId: string;
  jogadorId: string;
  apelido: string;
  /** "Hoje" da API: data de retorno padrão e maior data aceita. */
  hoje: string;
  aoCancelar: () => void;
  /** Reativou: recebe a data e a prévia confirmada (`null` quando o retorno foi hoje). */
  aoReativado: (dataRetorno: string, previa: PeriodoPreviaResposta | null) => void;
  /** O jogador não existe mais: quem abriu fecha o diálogo e avisa. */
  aoNaoEncontrado: () => void;
}

/** Reativar com data de retorno: retorno anterior a hoje passa pela prévia da API; hoje reativa direto. */
export function DialogoReativar({
  grupoId,
  jogadorId,
  apelido,
  hoje,
  aoCancelar,
  aoReativado,
  aoNaoEncontrado,
}: Props) {
  const [data, setData] = useState(hoje);
  const lista = usePeriodos(grupoId, jogadorId).data?.periodos ?? [];
  const saidaAnterior = lista.at(-1)?.fim ?? null;

  const previa = usePreviaPeriodos<CorpoReativar>(`${caminhoJogador(grupoId, jogadorId)}/reativar/previa`);
  const reativar = useReativarJogador(grupoId, jogadorId);

  const analise = useMemo(() => reativarCorpoComHoje(hoje).safeParse({ dataRetorno: data }), [hoje, data]);
  const erroLocal = deValidacao(analise).dataRetorno;
  const retroativa = analise.success && data < hoje;
  const corpo: CorpoReativar = { dataRetorno: data };

  const consultar = (c: CorpoReativar) => previa.mutate(c, { onError: (e) => ehNaoEncontrado(e) && aoNaoEncontrado() });

  const aoMudar = (valor: string) => {
    setData(valor);
    reativar.reset();
    if (valor < hoje && reativarCorpoComHoje(hoje).safeParse({ dataRetorno: valor }).success) {
      consultar({ dataRetorno: valor });
    } else {
      previa.reset();
    }
  };

  const doServidor = retroativa
    ? (mensagemDoCampo(previa.error, 'dataRetorno') ?? mensagemDoCampo(reativar.error, 'dataRetorno'))
    : mensagemDoCampo(reativar.error, 'dataRetorno');
  const erro = erroLocal ?? doServidor;

  const idCampo = useId();
  const recusado = erroLocal === undefined && doServidor !== undefined;
  useEffect(() => {
    if (recusado) document.getElementById(idCampo)?.focus();
  }, [recusado, idCampo]);

  const prontaPara = previa.isSuccess && retroativa && previa.variables.dataRetorno === data ? previa.data : undefined;
  let estadoPrevia: EstadoPrevia = { estado: 'vazia', texto: '' };
  if (retroativa && previa.isPending) estadoPrevia = { estado: 'calculando' };
  else if (prontaPara) estadoPrevia = { estado: 'pronta', previa: prontaPara };
  else if (retroativa && ehFalhaDeRede(previa.error)) {
    estadoPrevia = { estado: 'falhaRede', aoTentar: () => consultar(corpo) };
  }

  const podeReativar = analise.success && (data === hoje || prontaPara !== undefined);
  const confirmar = () => {
    if (!podeReativar) return;
    reativar.mutate(corpo, {
      onSuccess: () => aoReativado(data, prontaPara ?? null),
      onError: (e) => ehNaoEncontrado(e) && aoNaoEncontrado(),
    });
  };

  const ajuda = `Pode ser uma data que já passou, se ele voltou a jogar antes de você registrar.${
    saidaAnterior ? ` Não pode ser antes da saída anterior (${dataCompleta(saidaAnterior)}).` : ''
  }`;

  return (
    <Dialogo
      titulo={`Reativar ${apelido}`}
      descricao="Volta a aparecer no ranking e nas partidas; a data de início e os pontos não mudam."
      aoFechar={aoCancelar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao disabled={!podeReativar} carregando={reativar.isPending} onClick={confirmar}>
            Reativar
          </Botao>
        </>
      }
    >
      <CampoData
        rotulo="Data de retorno"
        id={idCampo}
        valor={data}
        aoMudar={aoMudar}
        max={hoje}
        ajuda={ajuda}
        erro={erro}
        erroComoAlerta
      />
      <PreviaPeriodos {...estadoPrevia} />
      {reativar.isError && ehFalhaDeRede(reativar.error) ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={confirmar}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível reativar. Verifique a conexão.
        </Faixa>
      ) : null}
    </Dialogo>
  );
}
