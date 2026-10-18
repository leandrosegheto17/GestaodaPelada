import type { EntradaSimulador, SugestaoDois } from '@pelada/contrato';
import { useEffect, useRef, useState } from 'react';
import { destinoAtual, MoverJogador, useAjusteSimulador } from '../../componentes/ajuste-simulador';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CartaoTime, JogadorTime, ListaAvisos, TabelaComparativa } from '../../componentes/cartao-time';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { BarraResultado } from './BarraResultado';
import { FaixasDoResultado } from './FaixasDoResultado';
import { LinhaContexto } from './LinhaContexto';
import estilos from './resultado.module.css';
import { TrocarJogador } from './TrocarJogador';
import { useConfirmacaoEscalacao } from './useConfirmacaoEscalacao';
import { useRefazer } from './useRefazer';

interface Props {
  grupoId: string;
  entrada: Extract<EntradaSimulador, { formato: 'dois_times' }>;
  sugestao: SugestaoDois;
  aoRefazer: () => void;
}

/** T13: sugestão para 2 times (1º e 2º tempo), com ajuste manual, confirmação e refazer. */
export function ResultadoDois({ grupoId, entrada, sugestao, aoRefazer }: Props) {
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const ajuste = useAjusteSimulador({ grupoId, entrada, sugestao });
  const composicao = ajuste.composicao;
  const { aoConfirmar, confirmando, falhouAoConfirmar } = useConfirmacaoEscalacao({ grupoId, entrada, composicao });
  const { aoPedirRefazer, dialogoRefazer } = useRefazer(ajuste.houveAjuste, aoRefazer);
  const [alvo, setAlvo] = useState<{ id: string; modo: 'mover' | 'trocar' } | null>(null);
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
  const [timeA, timeB] = exibicao.times;

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
      <FaixasDoResultado
        erroRecalculo={ajuste.erroRecalculo}
        tentarDeNovo={ajuste.tentarDeNovo}
        falhouAoConfirmar={falhouAoConfirmar}
      />
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
        confirmando={confirmando}
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
      <TrocarJogador alvo={alvo} jogador={jogadorDoAlvo} exibicao={exibicao} ajuste={ajuste} definirAlvo={setAlvo} />
      {dialogoRefazer}
    </div>
  );
}
