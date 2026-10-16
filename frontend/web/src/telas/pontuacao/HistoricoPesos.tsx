import type { PainelPesos } from '@pelada/contrato';
import { useId } from 'react';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { dataCompleta, formatarPontos } from '../../formatacao';
import { ORDEM_PESOS } from '../../rotulos/pesos';
import estilos from './pontuacao.module.css';

/** Configurações anteriores com quem registrou. Sem histórico, a seção não aparece. */
export function HistoricoPesos({ historico }: { historico: PainelPesos['historico'] }) {
  const id = useId();
  if (historico.length === 0) return null;
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Histórico
      </h2>
      <Lista>
        {historico.map((h) => (
          <Item
            key={h.vigenteDesde}
            titulo={`De ${dataCompleta(h.vigenteDesde)} a ${dataCompleta(h.vigenteAte)}`}
            meta={`${ORDEM_PESOS.map((chave) => formatarPontos(h[chave])).join(' · ')} · registrado por ${h.registradoPor}`}
          />
        ))}
      </Lista>
    </section>
  );
}
