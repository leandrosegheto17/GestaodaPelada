import type { PainelPesos } from '@pelada/contrato';
import { useId } from 'react';
import { TabelaSimples } from '../../componentes/listas/TabelaSimples';
import { dataCompleta, formatarPontos } from '../../formatacao';
import { ORDEM_PESOS, ROTULO_PESO } from '../../rotulos/pesos';
import estilos from './pontuacao.module.css';

/** Cartão com os pesos vigentes e desde quando valem. */
export function CartaoVigente({ vigente }: { vigente: PainelPesos['vigente'] }) {
  const id = useId();
  return (
    <section className={estilos.cartao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtituloSemTopo}>
        Vigente desde {dataCompleta(vigente.vigenteDesde)}
      </h2>
      <TabelaSimples
        legenda="Pesos vigentes"
        colunas={['Situação', 'Pontos']}
        linhas={ORDEM_PESOS.map((chave) => [ROTULO_PESO[chave], formatarPontos(vigente[chave])])}
      />
    </section>
  );
}
