import { inicioCorpo, type InicioPreviaResposta } from '@pelada/contrato';
import { useEffect, useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CampoData } from '../../componentes/campos/CampoData';
import { Dialogo } from '../../componentes/dialogos/Dialogo';
import { useAlterarInicio, useInicioPrevia } from '../../dados/elenco';
import { deValidacao, mensagemDoCampo as mensagemDoCampoApi } from '../../dados/errosDeCampos';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogadorId: string;
  /** "Hoje" da API: maior data aceita. */
  hoje: string;
  /** Data de início em vigor (padrão do campo). */
  atual: string;
  aoCancelar: () => void;
  /** Gravou: quem abriu fecha o diálogo e avisa. */
  aoAlterado: () => void;
}

/** Só formata o que a API calculou: nenhum ponto nem posição é conta da tela. */
function fraseDaPrevia(previa: InicioPreviaResposta, recuando: boolean): string {
  const { acumuladoAntes: antes, acumuladoDepois: depois, posicaoAntes, posicaoDepois } = previa;
  const posicao =
    posicaoAntes !== null && posicaoDepois !== null ? `; posição de ${posicaoAntes} para ${posicaoDepois}` : '';
  const n = previa.rodadasQuePassamAConstar;
  const rodadas = recuando && n > 0 ? ` ${n} ${n === 1 ? 'rodada passa' : 'rodadas passam'} a constar.` : '';
  return `Acumulado de ${antes} ${antes === 1 ? 'ponto' : 'pontos'} passa a ${depois}${posicao}.${rodadas}`;
}

const mensagemDoCampo = (erro: unknown) => mensagemDoCampoApi(erro, 'data');

/** Alterar a data de início: prévia da API ao informar uma data diferente; só confirma depois dela. */
export function DialogoInicio({ grupoId, jogadorId, hoje, atual, aoCancelar, aoAlterado }: Props) {
  const [data, setData] = useState(atual);
  const previa = useInicioPrevia(grupoId, jogadorId);
  const gravar = useAlterarInicio(grupoId, jogadorId);

  const vazia = data === '';
  const igual = data === atual;
  const analise = inicioCorpo(hoje).safeParse({ data });
  const erroLocal = vazia ? 'Informe a data de início.' : deValidacao(analise)['data'];
  const consulta = !vazia && !igual && analise.success;

  const aoMudar = (nova: string) => {
    setData(nova);
    gravar.reset();
    const valida = nova !== '' && nova !== atual && inicioCorpo(hoje).safeParse({ data: nova }).success;
    if (valida) previa.mutate({ data: nova });
    else previa.reset();
  };

  const prontaPara = previa.isSuccess && previa.variables.data === data && consulta ? previa.data : undefined;
  const falhaDaPrevia = consulta && previa.isError ? previa.error : null;
  const redeNaPrevia = falhaDaPrevia !== null && !mensagemDoCampo(falhaDaPrevia);
  const erroDoCampo =
    erroLocal ?? (consulta ? (mensagemDoCampo(falhaDaPrevia) ?? mensagemDoCampo(gravar.error)) : undefined);
  const redeAoGravar = gravar.isError && !mensagemDoCampo(gravar.error);

  const idCampo = useId();
  const recusaDoServidor = erroLocal === undefined ? erroDoCampo : undefined;
  useEffect(() => {
    if (recusaDoServidor) document.getElementById(idCampo)?.focus();
  }, [recusaDoServidor, idCampo]);

  let texto = '';
  if (igual) texto = 'Nada a alterar.';
  else if (consulta && previa.isPending) texto = 'Calculando…';
  else if (prontaPara) texto = fraseDaPrevia(prontaPara, data < atual);

  const confirmar = () => gravar.mutate({ data }, { onSuccess: aoAlterado });

  return (
    <Dialogo
      titulo="Alterar data de início"
      aoFechar={aoCancelar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao disabled={!prontaPara} carregando={gravar.isPending} onClick={confirmar}>
            Confirmar nova data
          </Botao>
        </>
      }
    >
      <CampoData
        rotulo="Data de início"
        id={idCampo}
        valor={data}
        aoMudar={aoMudar}
        max={hoje}
        ajuda="A pontuação do jogador conta a partir desta data. Nada é apagado: voltar a data devolve os pontos."
        erro={erroDoCampo}
        erroComoAlerta
      />
      <div aria-live="polite">
        <p className={estilos.paragrafo}>{texto}</p>
      </div>
      {redeNaPrevia ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={() => previa.mutate({ data })}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível calcular. Verifique a conexão.
        </Faixa>
      ) : null}
      {redeAoGravar ? <Faixa tipo="erro">Não foi possível alterar. Verifique a conexão e tente de novo.</Faixa> : null}
    </Dialogo>
  );
}
