import { Interruptor } from '../escolhas/Interruptor';
import { Folha, ListaFolha } from '../dialogos/Folha';
import { OpcaoFolha } from '../dialogos/OpcaoFolha';
import type { Destino, DestinoDois, DestinoVarios } from './composicaoLocal';
import estilos from './ajuste-simulador.module.css';

interface Comum {
  apelido: string;
  /** Nomes dos times na ordem ("Time A", "Time B" ou "Time 1…N"). */
  nomesDosTimes: readonly string[];
  aoEscolher: (destino: Destino) => void;
  aoTrocar: () => void;
  aoFechar: () => void;
}

type Props =
  | (Comum & {
      formato: 'dois_times';
      atual: DestinoDois;
      so1oTempo: boolean;
      aoAlternarSo1oTempo: (valor: boolean) => void;
    })
  | (Comum & { formato: 'varios_times'; atual: DestinoVarios });

const igual = (a: DestinoDois, b: DestinoDois): boolean =>
  'lugar' in a &&
  'lugar' in b &&
  a.lugar === b.lugar &&
  (a.lugar === 'naoEntra' || ('time' in a && 'time' in b && a.time === b.time));

/** D3: para onde levar o jogador. Destinos explícitos (sem arrastar e soltar); escolher fecha a folha. */
export function MoverJogador(props: Props) {
  const { apelido, nomesDosTimes, aoEscolher, aoTrocar, aoFechar } = props;
  const escolher = (destino: Destino) => {
    aoEscolher(destino);
    aoFechar();
  };

  if (props.formato === 'varios_times') {
    return (
      <Folha titulo={apelido} aoFechar={aoFechar}>
        <ListaFolha>
          {nomesDosTimes.map((nome, time) => (
            <OpcaoFolha key={nome} atual={props.atual.time === time} aoEscolher={() => escolher({ time })}>
              {props.atual.time === time ? nome : `Mover para ${nome}`}
            </OpcaoFolha>
          ))}
          <OpcaoFolha aoEscolher={aoTrocar}>Trocar com…</OpcaoFolha>
        </ListaFolha>
      </Folha>
    );
  }

  const times = [0, 1] as const;
  const destinos: { destino: DestinoDois; rotulo: string }[] = [
    ...times.map((time) => ({
      destino: { lugar: 'titular', time } as const,
      rotulo: `Titular do ${nomesDosTimes[time]}`,
    })),
    ...times.map((time) => ({
      destino: { lugar: 'entra', time } as const,
      rotulo: `Entra no 2º tempo pelo ${nomesDosTimes[time]}`,
    })),
    { destino: { lugar: 'naoEntra' }, rotulo: 'Não entra' },
  ];
  // Ordem do mockup: titular A, titular B, entra A, entra B, não entra.
  return (
    <Folha titulo={apelido} aoFechar={aoFechar}>
      <ListaFolha>
        {destinos.map(({ destino, rotulo }) => (
          <OpcaoFolha key={rotulo} atual={igual(props.atual, destino)} aoEscolher={() => escolher(destino)}>
            {rotulo}
          </OpcaoFolha>
        ))}
        <OpcaoFolha aoEscolher={aoTrocar}>Trocar com…</OpcaoFolha>
      </ListaFolha>
      <div className={estilos.interruptor}>
        <Interruptor
          rotulo="Só 1º tempo"
          marcado={props.so1oTempo}
          aoMudar={props.aoAlternarSo1oTempo}
          textoLigado="Sim"
          textoDesligado="Não"
        />
      </div>
    </Folha>
  );
}
