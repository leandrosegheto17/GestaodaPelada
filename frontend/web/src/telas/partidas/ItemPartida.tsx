import type { PartidasDoMes } from '@pelada/contrato';
import { IconeTempo } from '../../componentes/tabela-ranking/IconeTempo';
import { Item } from '../../componentes/listas/Item';
import { diaSemanaData } from '../../formatacao';
import { ROTULO_SITUACAO_PRESENCA } from '../../rotulos';
import estilos from './partidas.module.css';

type Partida = PartidasDoMes['partidas'][number];

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

interface Props {
  grupoId: string;
  partida: Partida;
}

/** Uma partida da lista: dia, chuva e contagens. O texto visível é abreviado; o falado, por extenso. */
export function ItemPartida({ grupoId, partida }: Props) {
  const { presentes, lesionados, expulsos } = partida.contagem;
  const letras = ROTULO_SITUACAO_PRESENCA;
  const visivel = `${presentes} ${letras.presente.letra} · ${lesionados} ${letras.lesionado.letra} · ${expulsos} ${letras.expulso.letra}`;
  const falado = [
    partida.choveu ? 'com chuva' : null,
    plural(presentes, 'presente', 'presentes'),
    plural(lesionados, 'lesionado', 'lesionados'),
    plural(expulsos, 'expulso', 'expulsos'),
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Item
      titulo={diaSemanaData(partida.data)}
      meta={
        <>
          <span aria-hidden="true">
            {partida.choveu ? (
              <>
                <span className={estilos.chuva}>
                  <IconeTempo choveu tamanho={14} />
                </span>{' '}
                chuva {'·'}{' '}
              </>
            ) : null}
            {visivel}
          </span>
          <span className="sr">{falado}</span>
        </>
      }
      para={`/admin/${encodeURIComponent(grupoId)}/partidas/${partida.data}`}
    />
  );
}
