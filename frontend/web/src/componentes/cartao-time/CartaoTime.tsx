import type { SugestaoDois, SugestaoVarios } from '@pelada/contrato';
import { useId } from 'react';
import { formatarDecimal1 } from '../../formatacao';
import { juntar } from '../basicos/juntar';
import { Selo } from '../basicos/Selo';
import { Indicadores } from '../listas/Indicadores';
import estilos from './CartaoTime.module.css';
import { JogadorTime } from './JogadorTime';

export type TimeDois = SugestaoDois['times'][number];
export type TimeVarios = SugestaoVarios['times'][number];

interface Comum {
  /** Jogadores que a pessoa moveu e que ainda esperam a reavaliação. */
  movidos?: ReadonlySet<string>;
  /** Indicadores sendo recalculados: os valores viram "recalculando…". */
  recalculando?: boolean;
  aoTocar: (id: string) => void;
}

type Props =
  | (Comum & { formato: 'dois_times'; time: TimeDois; variante: 'A' | 'B' })
  | (Comum & { formato: 'varios_times'; time: TimeVarios; n: number });

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className={estilos.grupo}>{titulo}</h3>
      {children}
    </>
  );
}

/** Cartão de um time. Só exibe o que a API calculou: nada é somado, ordenado ou contado aqui. */
export function CartaoTime(props: Props) {
  const id = useId();
  const { movidos, recalculando, aoTocar } = props;
  const movido = (jogadorId: string) => movidos?.has(jogadorId) ?? false;

  if (props.formato === 'dois_times') {
    const { time, variante } = props;
    return (
      <section className={juntar(estilos.cartao, variante === 'B' && estilos.b)} aria-labelledby={id}>
        <h2 id={id} className={estilos.titulo}>
          {time.nome}
        </h2>
        <Grupo titulo="Titulares">
          <ul className={estilos.jogadores}>
            {time.titulares.map((j) => (
              <li key={j.id}>
                <JogadorTime
                  apelido={j.apelido}
                  selos={{ so1oTempo: j.so1oTempo, saiNoIntervalo: j.saiNoIntervalo, semNota: j.semNota }}
                  movido={movido(j.id)}
                  aoTocar={() => aoTocar(j.id)}
                />
              </li>
            ))}
          </ul>
        </Grupo>
        <Grupo titulo="Entram no 2º tempo">
          <ul className={estilos.jogadores}>
            {time.entramNo2oTempo.map((j) => (
              <li key={j.id}>
                <JogadorTime
                  apelido={j.apelido}
                  selos={{ so2oTempo: j.so1oTempo, semNota: j.semNota }}
                  movido={movido(j.id)}
                  aoTocar={() => aoTocar(j.id)}
                />
              </li>
            ))}
          </ul>
        </Grupo>
        <Grupo titulo="Trocas no intervalo">
          <ul className={estilos.pares}>
            {time.trocas.map((t) => (
              <li key={`${t.sai}-${t.entra}`}>
                {t.sai} → {t.entra}
              </li>
            ))}
          </ul>
        </Grupo>
      </section>
    );
  }

  const { time, n } = props;
  const quantos = time.jogadores.length;
  const valor = (texto: string) => (recalculando ? 'recalculando…' : texto);
  return (
    <section className={juntar(estilos.cartao, time.incompleto && estilos.incompleto)} aria-labelledby={id}>
      <h2 id={id} className={estilos.titulo}>
        {time.nome}
        {time.incompleto ? <Selo tom="neutro">{`Incompleto (${quantos} de ${n})`}</Selo> : null}
      </h2>
      <ul className={estilos.jogadores}>
        {time.jogadores.map((j) => (
          <li key={j.id}>
            <JogadorTime
              apelido={j.apelido}
              selos={{ semNota: j.semNota }}
              movido={movido(j.id)}
              aoTocar={() => aoTocar(j.id)}
            />
          </li>
        ))}
      </ul>
      <Indicadores
        itens={[
          { rotulo: 'Jogadores', valor: valor(String(time.indicadores.jogadores)) },
          { rotulo: 'Nível médio', valor: valor(formatarDecimal1(time.indicadores.nivelMedio)) },
          { rotulo: 'Nível somado', valor: valor(formatarDecimal1(time.indicadores.nivelSoma)) },
          { rotulo: 'Idade média', valor: valor(formatarDecimal1(time.indicadores.idadeMedia)) },
        ]}
      />
    </section>
  );
}
