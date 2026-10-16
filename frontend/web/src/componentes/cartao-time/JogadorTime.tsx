import { Selo } from '../basicos/Selo';
import { juntar } from '../basicos/juntar';
import estilos from './CartaoTime.module.css';

export interface SelosDoJogador {
  /** Titular que só joga o 1º tempo. */
  so1oTempo?: boolean;
  saiNoIntervalo?: boolean;
  /** Reserva "só 1º tempo" que entra: joga apenas o 2º tempo. */
  so2oTempo?: boolean;
  semNota?: boolean;
}

interface Props {
  apelido: string;
  selos?: SelosDoJogador;
  /** Jogador que a pessoa trocou de lugar e ainda não foi reavaliado. */
  movido?: boolean;
  aoTocar: () => void;
}

/** Jogador no cartão do time: botão que abre o diálogo de mover/trocar, com os selos que a API manda. */
export function JogadorTime({ apelido, selos = {}, movido, aoTocar }: Props) {
  const lista = [
    selos.so1oTempo ? { tom: 'info', texto: 'só 1º tempo' } : null,
    selos.saiNoIntervalo ? { tom: 'atencao', texto: 'sai no intervalo' } : null,
    selos.so2oTempo ? { tom: 'info', texto: 'joga só o 2º tempo' } : null,
    selos.semNota ? { tom: 'atencao', texto: 'sem nota' } : null,
    movido ? { tom: 'info', texto: 'movido' } : null,
  ].flatMap((s) => (s ? [s as { tom: 'info' | 'atencao'; texto: string }] : []));
  return (
    <button
      type="button"
      className={juntar(estilos.jogador, movido && estilos.movido)}
      aria-haspopup="dialog"
      onClick={aoTocar}
    >
      <span>{apelido}</span>
      {lista.length > 0 ? (
        <span className={estilos.selos}>
          {lista.map((s) => (
            <Selo key={s.texto} tom={s.tom}>
              {s.texto}
            </Selo>
          ))}
        </span>
      ) : null}
    </button>
  );
}
