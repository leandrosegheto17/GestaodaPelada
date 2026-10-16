import { formatarDecimal1 } from '../../formatacao';
import type { TimeDois } from './CartaoTime';
import estilos from './TabelaComparativa.module.css';

interface Props {
  times: readonly [TimeDois, TimeDois];
  /** Os indicadores esperam a resposta da avaliação: as células viram "recalculando…". */
  recalculando?: boolean;
}

const soma = (total: number, media: number) => `${formatarDecimal1(total)} · ${formatarDecimal1(media)}`;

/** Comparação dos dois times com os indicadores da API, só formatados. */
export function TabelaComparativa({ times, recalculando }: Props) {
  const linhas: { rotulo: string; valor: (t: TimeDois) => string }[] = [
    {
      rotulo: 'Nível no 1º tempo (soma · média)',
      valor: (t) => soma(t.indicadores.nivelSoma1oTempo, t.indicadores.nivelMedio1oTempo),
    },
    {
      rotulo: 'Nível no 2º tempo (soma · média)',
      valor: (t) => soma(t.indicadores.nivelSoma2oTempo, t.indicadores.nivelMedio2oTempo),
    },
    { rotulo: 'Idade média', valor: (t) => formatarDecimal1(t.indicadores.idadeMedia) },
    { rotulo: 'Substituições', valor: (t) => String(t.indicadores.substituicoes) },
  ];
  return (
    <>
      {recalculando ? (
        <p className="sr" role="status">
          Recalculando os indicadores…
        </p>
      ) : null}
      <table className={estilos.comparativo} aria-busy={recalculando || undefined}>
        <caption className="sr">Comparação entre os times</caption>
        <thead>
          <tr>
            <td />
            {times.map((t) => (
              <th key={t.nome} scope="col">
                {t.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo}>
              <th scope="row">{l.rotulo}</th>
              {times.map((t) =>
                recalculando ? (
                  <td key={t.nome} className={estilos.recalculando}>
                    recalculando…
                  </td>
                ) : (
                  <td key={t.nome}>{l.valor(t)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
