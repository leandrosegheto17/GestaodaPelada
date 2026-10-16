import type { EntradaSimulador, SugestaoDois } from '@pelada/contrato';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  destinoAtual,
  MoverJogador,
  paraCorpoEscalacao,
  TrocarCom,
  useAjusteSimulador,
} from '../../componentes/ajuste-simulador';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CartaoTime, JogadorTime, ListaAvisos, TabelaComparativa } from '../../componentes/cartao-time';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { estadoRetorno } from '../../dados/retorno';
import { useConfirmarEscalacao } from '../../dados/simulador';
import { BarraResultado } from './BarraResultado';
import { gruposParaTrocar } from './gruposParaTrocar';
import { LinhaContexto } from './LinhaContexto';
import estilos from './resultado.module.css';

interface Props {
  grupoId: string;
  entrada: Extract<EntradaSimulador, { formato: 'dois_times' }>;
  sugestao: SugestaoDois;
  aoRefazer: () => void;
}

export const MENSAGEM_FALHA_CONFIRMAR = 'Não foi possível confirmar a escalação. Tente de novo.';

/** T13: sugestão para 2 times (1º e 2º tempo), com ajuste manual, confirmação e refazer. */
export function ResultadoDois({ grupoId, entrada, sugestao, aoRefazer }: Props) {
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const navegar = useNavigate();
  const ajuste = useAjusteSimulador({ grupoId, entrada, sugestao });
  const confirmar = useConfirmarEscalacao(grupoId);
  const [alvo, setAlvo] = useState<{ id: string; modo: 'mover' | 'trocar' } | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [falhouAoConfirmar, setFalhouAoConfirmar] = useState(false);
  const [atualizado, setAtualizado] = useState(false);

  const estavaRecalculando = useRef(false);
  useEffect(() => {
    if (ajuste.recalculando) {
      estavaRecalculando.current = true;
      setAtualizado(false);
    } else if (estavaRecalculando.current) {
      estavaRecalculando.current = false;
      setAtualizado(!ajuste.erroRecalculo);
    }
  }, [ajuste.recalculando, ajuste.erroRecalculo]);

  const exibicao = ajuste.exibicao;
  if (exibicao.formato !== 'dois_times') return null;
  const composicao = ajuste.composicao;
  const [timeA, timeB] = exibicao.times;

  const aoConfirmar = () => {
    const corpo = paraCorpoEscalacao(entrada, composicao);
    if (!corpo) {
      setFalhouAoConfirmar(true);
      return;
    }
    setFalhouAoConfirmar(false);
    confirmar.mutate(corpo, {
      onSuccess: () =>
        void navegar(base, { state: estadoRetorno({ tipo: 'escalacao-confirmada', data: entrada.data }) }),
      onError: () => setFalhouAoConfirmar(true),
    });
  };

  const aoPedirRefazer = () => {
    if (ajuste.houveAjuste) setDescartando(true);
    else aoRefazer();
  };

  const jogadorDoAlvo = alvo
    ? [
        ...timeA.titulares,
        ...timeA.entramNo2oTempo,
        ...timeB.titulares,
        ...timeB.entramNo2oTempo,
        ...exibicao.naoEntra,
      ].find((j) => j.id === alvo.id)
    : undefined;
  const atual = alvo ? destinoAtual(composicao, alvo.id) : null;
  const nomes = [timeA.nome, timeB.nome];

  return (
    <div>
      <title>Times sugeridos</title>
      <Voltar para={`${base}/simulador`} rotulo="Simulador" />
      <TituloPagina>Times sugeridos</TituloPagina>
      <LinhaContexto entrada={entrada} />
      {ajuste.erroRecalculo ? (
        <div className={estilos.faixa}>
          <Faixa
            tipo="erro"
            acao={
              <Botao variante="texto" onClick={ajuste.tentarDeNovo}>
                Tentar de novo
              </Botao>
            }
          >
            {ajuste.erroRecalculo}
          </Faixa>
        </div>
      ) : null}
      {falhouAoConfirmar ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">{MENSAGEM_FALHA_CONFIRMAR}</Faixa>
        </div>
      ) : null}
      <ListaAvisos avisos={exibicao.avisos} />
      <TabelaComparativa times={[timeA, timeB]} recalculando={ajuste.recalculando} />
      {atualizado ? (
        <p className="sr" role="status">
          Indicadores atualizados
        </p>
      ) : null}
      <div className={`${estilos.times} ${estilos.timesDois}`}>
        <CartaoTime
          formato="dois_times"
          time={timeA}
          variante="A"
          movidos={ajuste.movidos}
          aoTocar={(id) => setAlvo({ id, modo: 'mover' })}
        />
        <CartaoTime
          formato="dois_times"
          time={timeB}
          variante="B"
          movidos={ajuste.movidos}
          aoTocar={(id) => setAlvo({ id, modo: 'mover' })}
        />
      </div>
      <section className={estilos.secao} aria-labelledby="nao-entra">
        <h2 id="nao-entra" className={estilos.subtitulo}>
          Não entra
        </h2>
        <ul className={estilos.lista}>
          {exibicao.naoEntra.map((j) => (
            <li key={j.id}>
              <JogadorTime
                apelido={j.apelido}
                selos={{ semNota: j.semNota }}
                movido={ajuste.movidos.has(j.id)}
                aoTocar={() => setAlvo({ id: j.id, modo: 'mover' })}
              />
            </li>
          ))}
        </ul>
        <p className={estilos.ajuda}>Compareceram e recebem a pontuação de presença.</p>
      </section>
      <details className={estilos.recolhivel}>
        <summary>Ordem de prioridade</summary>
        <ol>
          {sugestao.ordemPrioridade.map((apelido, i) => (
            <li key={`${apelido}-${i}`}>{apelido}</li>
          ))}
        </ol>
      </details>
      <BarraResultado
        confirmarDesabilitado={!ajuste.podeConfirmar}
        confirmando={confirmar.isPending}
        aoConfirmar={aoConfirmar}
        aoRefazer={aoPedirRefazer}
        destinoEditar={`${base}/simulador`}
        entrada={entrada}
      />
      {alvo && jogadorDoAlvo && atual && 'lugar' in atual && alvo.modo === 'mover' ? (
        <MoverJogador
          formato="dois_times"
          apelido={jogadorDoAlvo.apelido}
          nomesDosTimes={nomes}
          atual={atual}
          so1oTempo={composicao.formato === 'dois_times' && composicao.so1oTempo.has(alvo.id)}
          aoEscolher={(destino) => ajuste.mover(alvo.id, destino)}
          aoTrocar={() => setAlvo({ id: alvo.id, modo: 'trocar' })}
          aoAlternarSo1oTempo={(valor) => ajuste.definirSo1oTempo(alvo.id, valor)}
          aoFechar={() => setAlvo(null)}
        />
      ) : null}
      {alvo && jogadorDoAlvo && alvo.modo === 'trocar' ? (
        <TrocarCom
          apelido={jogadorDoAlvo.apelido}
          grupos={gruposParaTrocar(exibicao, alvo.id)}
          aoEscolher={(outro) => ajuste.trocar(alvo.id, outro)}
          aoVoltar={() => setAlvo({ id: alvo.id, modo: 'mover' })}
          aoFechar={() => setAlvo(null)}
        />
      ) : null}
      {descartando ? (
        <DialogoConfirmacao
          {...textosConfirmacao.refazerSugestao()}
          aoConfirmar={() => {
            setDescartando(false);
            aoRefazer();
          }}
          aoCancelar={() => setDescartando(false)}
        />
      ) : null}
    </div>
  );
}
