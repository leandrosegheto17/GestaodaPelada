import type { MesFinanceiro } from '@pelada/contrato';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Icone } from '../../componentes/basicos/Icone';
import { Selo } from '../../componentes/basicos/Selo';
import { juntar } from '../../componentes/basicos/juntar';
import { diaMes, formatarMoeda } from '../../formatacao';
import { ROTULO_TIPO_LANCAMENTO } from '../../rotulos';
import { agruparMensalidades } from './agruparMensalidades';
import estilos from './financeiro.module.css';

type Lancamento = MesFinanceiro['lancamentos'][number];

interface Props {
  lancamentos: readonly Lancamento[];
  mes: string;
  /** Caminho base dos lançamentos: `/admin/<g>/financeiro/lancamentos`. */
  base: string;
}

function Tipo({ tipo }: { tipo: Lancamento['tipo'] }) {
  return (
    <>
      <Icone nome={tipo === 'entrada' ? 'subir' : 'baixar'} tamanho={14} /> {ROTULO_TIPO_LANCAMENTO[tipo]}
    </>
  );
}

function Valor({ lancamento }: { lancamento: Lancamento }) {
  const texto = formatarMoeda(lancamento.valorCentavos);
  return <span className={estilos.valorLancamento}>{lancamento.tipo === 'saida' ? `− ${texto}` : texto}</span>;
}

function LinhaLancamento({ lancamento, base }: { lancamento: Lancamento; base: string }) {
  return (
    <li>
      <Link className={estilos.itemLancamento} to={`${base}/${encodeURIComponent(lancamento.id)}`}>
        <span className={estilos.principal}>
          <span className={estilos.titulo}>{lancamento.descricao}</span>
          <span className={estilos.meta}>
            {diaMes(lancamento.data)} · <Tipo tipo={lancamento.tipo} />
          </span>
        </span>
        <Valor lancamento={lancamento} />
      </Link>
    </li>
  );
}

/** Lançamentos do mês; as mensalidades viram uma linha que abre para mostrar cada uma. */
export function SecaoLancamentos({ lancamentos, mes, base }: Props) {
  const id = useId();
  const [aberta, setAberta] = useState(false);
  const itens = agruparMensalidades(lancamentos, mes);
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Lançamentos do mês
      </h2>
      {itens.length === 0 ? (
        <p className={estilos.ajuda}>Nenhum lançamento neste mês.</p>
      ) : (
        <ul className={estilos.lista}>
          {itens.map((item) =>
            item.tipo === 'avulso' ? (
              <LinhaLancamento key={item.lancamento.id} lancamento={item.lancamento} base={base} />
            ) : (
              <li key="mensalidades">
                <button
                  type="button"
                  className={juntar(estilos.itemLancamento, estilos.botaoItem)}
                  aria-expanded={aberta}
                  onClick={() => setAberta((v) => !v)}
                >
                  <span className={estilos.principal}>
                    <span className={estilos.titulo}>{item.titulo}</span>
                    <span className={estilos.meta}>
                      {item.periodo} · <Tipo tipo="entrada" /> · <Selo>mensalidade</Selo>
                    </span>
                  </span>
                  <span className={estilos.valorLancamento}>{formatarMoeda(item.totalCentavos)}</span>
                </button>
                {aberta ? (
                  <ul className={estilos.listaInterna}>
                    {item.itens.map((l) => (
                      <LinhaLancamento key={l.id} lancamento={l} base={base} />
                    ))}
                  </ul>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
      {itens.some((i) => i.tipo === 'mensalidades') ? (
        <p className={estilos.ajuda}>As mensalidades do mês aparecem numa linha só; toque para ver cada uma.</p>
      ) : null}
    </section>
  );
}
