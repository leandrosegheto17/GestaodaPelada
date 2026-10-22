import { periodoCorrigirCorpo, type PeriodoCorrigirCorpo, type PeriodoPreviaResposta } from '@pelada/contrato';
import { useEffect, useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CampoData } from '../../componentes/campos/CampoData';
import { Dialogo } from '../../componentes/dialogos/Dialogo';
import { PreviaPeriodos, type EstadoPrevia } from '../../componentes/previa-periodos';
import { usePeriodos, type PeriodoDoJogador } from '../../dados/elenco';
import { ErroApi } from '../../dados/erros';
import { deErroApi, deValidacao, mensagemDoCampo } from '../../dados/errosDeCampos';
import { caminhoPeriodo, useCorrigirPeriodo, usePreviaPeriodos } from '../../dados/periodos';
import { dataCompleta } from '../../formatacao';

type NomeCampo = 'saida' | 'retorno';
type Valores = Record<NomeCampo, string>;

interface Props {
  grupoId: string;
  jogadorId: string;
  apelido: string;
  /** "Hoje" da API: maior data aceita. */
  hoje: string;
  periodo: PeriodoDoJogador;
  aoCancelar: () => void;
  /** Gravou: recebe a prévia confirmada; quem abriu fecha o diálogo e avisa. */
  aoCorrigido: (previa: PeriodoPreviaResposta) => void;
  /** O jogador não existe mais: quem abriu fecha o diálogo e avisa. */
  aoNaoEncontrado: () => void;
}

const AVISO_ENTRADA = 'A entrada é a data de início da pontuação; para mudá-la, use Alterar data de início.';

/** Só os campos que a API diz que o período aceita corrigir. */
const corpoDe = ({ corrigivel }: PeriodoDoJogador, v: Valores): PeriodoCorrigirCorpo => ({
  ...(corrigivel.saida ? { saida: v.saida } : {}),
  ...(corrigivel.retorno ? { retorno: v.retorno } : {}),
});
const mesmoCorpo = (a: PeriodoCorrigirCorpo, b: PeriodoCorrigirCorpo) => a.saida === b.saida && a.retorno === b.retorno;
const ehNaoEncontrado = (erro: unknown) => erro instanceof ErroApi && erro.status === 404;
/** Falha que não é recusa de campo nem 404: rede, indisponibilidade. */
const ehFalhaDeRede = (erro: unknown) => erro != null && deErroApi(erro) === null && !ehNaoEncontrado(erro);

/** Corrigir saída e/ou retorno de um período: prévia da API ao informar uma data diferente; só confirma depois dela. */
export function DialogoCorrigirDatas({
  grupoId,
  jogadorId,
  apelido,
  hoje,
  periodo,
  aoCancelar,
  aoCorrigido,
  aoNaoEncontrado,
}: Props) {
  const original: Valores = { saida: periodo.fim ?? '', retorno: periodo.inicio };
  const [valores, setValores] = useState(original);
  const lista = usePeriodos(grupoId, jogadorId).data?.periodos ?? [];
  const posicao = lista.findIndex((p) => p.id === periodo.id);
  const anterior = posicao > 0 ? lista[posicao - 1] : undefined;
  const proximo = posicao >= 0 ? lista[posicao + 1] : undefined;

  const previa = usePreviaPeriodos<PeriodoCorrigirCorpo>(`${caminhoPeriodo(grupoId, jogadorId, periodo.id)}/previa`);
  const gravar = useCorrigirPeriodo(grupoId, jogadorId, periodo.id);

  const corpo = corpoDe(periodo, valores);
  const igual = mesmoCorpo(corpo, corpoDe(periodo, original));
  const analise = periodoCorrigirCorpo.safeParse(corpo);
  const errosLocais = deValidacao(analise);
  const consulta = !igual && analise.success;

  const consultar = (c: PeriodoCorrigirCorpo) =>
    previa.mutate(c, { onError: (e) => ehNaoEncontrado(e) && aoNaoEncontrado() });

  const aoMudar = (campo: NomeCampo, valor: string) => {
    const novos = { ...valores, [campo]: valor };
    const novoCorpo = corpoDe(periodo, novos);
    setValores(novos);
    gravar.reset();
    if (!mesmoCorpo(novoCorpo, corpoDe(periodo, original)) && periodoCorrigirCorpo.safeParse(novoCorpo).success) {
      consultar(novoCorpo);
    } else {
      previa.reset();
    }
  };

  const doServidor = (campo: NomeCampo) =>
    consulta ? (mensagemDoCampo(previa.error, campo) ?? mensagemDoCampo(gravar.error, campo)) : undefined;
  const erroDe = (campo: NomeCampo) => errosLocais[campo] ?? doServidor(campo);

  const idBase = useId();
  const idDe = (campo: NomeCampo) => `${idBase}-${campo}`;
  const recusado = (['saida', 'retorno'] as const).find((c) => errosLocais[c] === undefined && doServidor(c));
  useEffect(() => {
    if (recusado) document.getElementById(`${idBase}-${recusado}`)?.focus();
  }, [recusado, idBase]);

  const prontaPara = previa.isSuccess && consulta && mesmoCorpo(previa.variables, corpo) ? previa.data : undefined;
  let estadoPrevia: EstadoPrevia = { estado: 'vazia', texto: igual ? 'Nada a alterar.' : '' };
  if (consulta && previa.isPending) estadoPrevia = { estado: 'calculando' };
  else if (prontaPara) estadoPrevia = { estado: 'pronta', previa: prontaPara };
  else if (consulta && ehFalhaDeRede(previa.error)) {
    estadoPrevia = { estado: 'falhaRede', aoTentar: () => consultar(corpo) };
  }

  const confirmar = () => {
    if (!prontaPara) return;
    gravar.mutate(corpo, {
      onSuccess: () => aoCorrigido(prontaPara),
      onError: (e) => ehNaoEncontrado(e) && aoNaoEncontrado(),
    });
  };

  const tipo = periodo.tipo === 'entrada' ? 'Entrada' : 'Retorno';
  const ajudaSaida = `Ele deixa de aparecer nas partidas a partir desta data.${
    proximo ? ` Não pode ser depois do próximo retorno (${dataCompleta(proximo.inicio)}).` : ''
  }`;
  const ajudaRetorno = `Ele volta a aparecer nas partidas a partir desta data.${
    anterior?.fim ? ` Não pode ser antes da saída anterior (${dataCompleta(anterior.fim)}).` : ''
  }`;

  return (
    <Dialogo
      titulo="Corrigir datas"
      descricao={
        <>
          {tipo} de {apelido}: {dataCompleta(periodo.inicio)} <span aria-hidden="true">→</span>
          <span className="sr">até</span> {periodo.fim ? dataCompleta(periodo.fim) : 'atual'}.
          {periodo.tipo === 'entrada' ? ` ${AVISO_ENTRADA}` : ''}
        </>
      }
      aoFechar={aoCancelar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao disabled={!prontaPara} carregando={gravar.isPending} onClick={confirmar}>
            Confirmar novas datas
          </Botao>
        </>
      }
    >
      {periodo.corrigivel.saida ? (
        <CampoData
          rotulo="Data de saída"
          id={idDe('saida')}
          valor={valores.saida}
          aoMudar={(v) => aoMudar('saida', v)}
          max={hoje}
          ajuda={ajudaSaida}
          erro={erroDe('saida')}
          erroComoAlerta
        />
      ) : null}
      {periodo.corrigivel.retorno ? (
        <CampoData
          rotulo="Data de retorno"
          id={idDe('retorno')}
          valor={valores.retorno}
          aoMudar={(v) => aoMudar('retorno', v)}
          max={hoje}
          ajuda={ajudaRetorno}
          erro={erroDe('retorno')}
          erroComoAlerta
        />
      ) : null}
      <PreviaPeriodos {...estadoPrevia} />
      {gravar.isError && ehFalhaDeRede(gravar.error) ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={confirmar}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível salvar. Verifique a conexão.
        </Faixa>
      ) : null}
    </Dialogo>
  );
}
