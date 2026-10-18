import type { EntradaSimulador, SugestaoVarios } from '@pelada/contrato';
import { useState } from 'react';
import { destinoAtual, MoverJogador, useAjusteSimulador } from '../../componentes/ajuste-simulador';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CartaoTime, ListaAvisos } from '../../componentes/cartao-time';
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
  entrada: Extract<EntradaSimulador, { formato: 'varios_times' }>;
  sugestao: SugestaoVarios;
  aoRefazer: () => void;
}

/** T14: sugestão para 3 ou mais times (sem tempos), com ajuste manual, confirmação e refazer. */
export function ResultadoVarios({ grupoId, entrada, sugestao, aoRefazer }: Props) {
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const ajuste = useAjusteSimulador({ grupoId, entrada, sugestao });
  const composicao = ajuste.composicao;
  const { aoConfirmar, confirmando, falhouAoConfirmar } = useConfirmacaoEscalacao({ grupoId, entrada, composicao });
  const { aoPedirRefazer, dialogoRefazer } = useRefazer(ajuste.houveAjuste, aoRefazer);
  const [alvo, setAlvo] = useState<{ id: string; modo: 'mover' | 'trocar' } | null>(null);

  const exibicao = ajuste.exibicao;
  if (exibicao.formato !== 'varios_times') return null;

  const jogadorDoAlvo = alvo ? exibicao.times.flatMap((t) => t.jogadores).find((j) => j.id === alvo.id) : undefined;
  const atual = alvo ? destinoAtual(composicao, alvo.id) : null;

  return (
    <div>
      <title>Times sugeridos</title>
      <Voltar para={`${base}/simulador`} rotulo="Simulador" />
      <TituloPagina>Times sugeridos</TituloPagina>
      <LinhaContexto
        entrada={entrada}
        times={exibicao.times.map((t) => ({ incompleto: t.incompleto, tamanho: t.jogadores.length }))}
      />
      <FaixasDoResultado
        erroRecalculo={ajuste.erroRecalculo}
        tentarDeNovo={ajuste.tentarDeNovo}
        falhouAoConfirmar={falhouAoConfirmar}
      />
      <ListaAvisos avisos={exibicao.avisos} />
      <div className={`${estilos.times} ${estilos.timesVarios}`}>
        {exibicao.times.map((time) => (
          <CartaoTime
            key={time.nome}
            formato="varios_times"
            time={time}
            n={entrada.n}
            movidos={ajuste.movidos}
            recalculando={ajuste.recalculando}
            aoTocar={(id) => setAlvo({ id, modo: 'mover' })}
          />
        ))}
      </div>
      <BarraResultado
        confirmarDesabilitado={!ajuste.podeConfirmar}
        confirmando={confirmando}
        aoConfirmar={aoConfirmar}
        aoRefazer={aoPedirRefazer}
        destinoEditar={`${base}/simulador`}
        entrada={entrada}
      />
      {alvo && jogadorDoAlvo && atual && !('lugar' in atual) && alvo.modo === 'mover' ? (
        <MoverJogador
          formato="varios_times"
          apelido={jogadorDoAlvo.apelido}
          nomesDosTimes={exibicao.times.map((t) => t.nome)}
          atual={atual}
          aoEscolher={(destino) => ajuste.mover(alvo.id, destino)}
          aoTrocar={() => setAlvo({ id: alvo.id, modo: 'trocar' })}
          aoFechar={() => setAlvo(null)}
        />
      ) : null}
      <TrocarJogador alvo={alvo} jogador={jogadorDoAlvo} exibicao={exibicao} ajuste={ajuste} definirAlvo={setAlvo} />
      {dialogoRefazer}
    </div>
  );
}
