import type { MesFinanceiro } from '@pelada/contrato';
import { useId } from 'react';
import { juntar } from '../../componentes/basicos/juntar';
import { formatarMoeda } from '../../formatacao';
import estilos from './financeiro.module.css';

interface Props {
  saldoAtualCentavos: number;
  resumo: NonNullable<MesFinanceiro['resumoMes']>;
}

/** Valor em reais; negativo ganha o "−" e a palavra "negativo" para quem não vê a cor (1.4.1). */
function Valor({ centavos }: { centavos: number }) {
  return (
    <span className={juntar(centavos < 0 && estilos.negativo)}>
      {formatarMoeda(centavos)}
      {centavos < 0 ? <span className="sr"> (negativo)</span> : null}
    </span>
  );
}

/** Saldo atual e o resumo do mês, com os valores prontos da API: nada é somado na tela. */
export function CartaoSaldos({ saldoAtualCentavos, resumo }: Props) {
  const id = useId();
  return (
    <section className={estilos.saldos} aria-labelledby={id}>
      <p className={estilos.saldosRotulo} id={id}>
        Saldo atual
      </p>
      <p className={estilos.saldosValor}>
        <Valor centavos={saldoAtualCentavos} />
      </p>
      <dl className={estilos.saldosGrade}>
        <dt>Entradas no mês</dt>
        <dd>
          <Valor centavos={resumo.entradasCentavos} />
        </dd>
        <dt>Saídas no mês</dt>
        <dd>
          <Valor centavos={resumo.saidasCentavos} />
        </dd>
        <dt>Resultado do mês</dt>
        <dd>
          <Valor centavos={resumo.resultadoCentavos} />
        </dd>
        <dt>Não pagaram</dt>
        <dd>
          {resumo.naoPagaram} {resumo.naoPagaram === 1 ? 'jogador' : 'jogadores'}
        </dd>
      </dl>
    </section>
  );
}
