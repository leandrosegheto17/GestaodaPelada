import { useId } from 'react';
import { ORDEM_SITUACAO_RODADA, ROTULO_SITUACAO_RODADA } from '../../rotulos';
import { IconeTempo } from './IconeTempo';
import { MarcaRodada } from './MarcaRodada';
import estilos from './Legenda.module.css';

/** Pontos de exemplo de cada situação (só ilustração; não são dados). */
const EXEMPLO = { presente: 1, lesionado: 1, expulso: -1, falta: 0, fora: null } as const;

export function Legenda() {
  const idTitulo = useId();
  return (
    <section className={estilos.legenda} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.titulo}>
        Legenda
      </h2>
      <p className={estilos.explica}>
        A cor mostra a situação; o número, os pontos da rodada. Pts inicial + rodadas do mês = Pts final.
      </p>
      <ul className={estilos.itens}>
        {ORDEM_SITUACAO_RODADA.map((situacao) => {
          const rotulo = ROTULO_SITUACAO_RODADA[situacao];
          return (
            <li key={situacao}>
              <MarcaRodada situacao={situacao} pontos={EXEMPLO[situacao]} decorativa />
              {'legenda' in rotulo ? rotulo.legenda : rotulo.texto}
            </li>
          );
        })}
        <li>
          <span className={estilos.tempo}>
            <IconeTempo choveu={false} />
          </span>
          Jogo sem chuva
        </li>
        <li>
          <span className={estilos.tempo}>
            <IconeTempo choveu />
          </span>
          Jogo com chuva
        </li>
      </ul>
    </section>
  );
}
