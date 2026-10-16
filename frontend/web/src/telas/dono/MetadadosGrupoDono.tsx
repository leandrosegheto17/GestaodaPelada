import type { GrupoDono } from '@pelada/contrato';
import { useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Selo } from '../../componentes/basicos/Selo';
import { dataCompleta } from '../../formatacao';
import { diaEFrequencia } from '../../formatacao/agenda';
import { copiarLink, type ResultadoCopia } from '../grupo/compartilhar';
import estilos from './dono.module.css';

/** Metadados do grupo e, enquanto ativo, o link público como veio da API (com Copiar). */
export function MetadadosGrupoDono({ grupo }: { grupo: GrupoDono }) {
  const idTitulo = useId();
  const idUrl = useId();
  const [copia, setCopia] = useState<ResultadoCopia | null>(null);
  return (
    <>
      <dl className={`${estilos.indicadores} ${estilos.cartao}`}>
        <dt>Dia e frequência</dt>
        <dd>{diaEFrequencia(grupo)}</dd>
        <dt>Horário</dt>
        <dd>{grupo.horario}</dd>
        <dt>Criado em</dt>
        <dd>{dataCompleta(grupo.criadoEm)}</dd>
        {grupo.arquivadoEm ? (
          <>
            <dt>Arquivado em</dt>
            <dd>{dataCompleta(grupo.arquivadoEm)}</dd>
          </>
        ) : null}
      </dl>
      {grupo.arquivadoEm ? null : (
        <section className={estilos.secao} aria-labelledby={idTitulo}>
          <h2 id={idTitulo} className={estilos.subtitulo}>
            Link do ranking
          </h2>
          <p id={idUrl} className={estilos.paragrafo}>
            <strong>{grupo.urlPublica}</strong>
          </p>
          <Botao
            variante="secundario"
            aria-describedby={idUrl}
            onClick={() => void copiarLink(grupo.urlPublica).then(setCopia)}
          >
            Copiar
          </Botao>
          <div role="status" className={estilos.acima3}>
            {copia === 'copiado' ? <Selo tom="sucesso">Link copiado</Selo> : null}
            {copia === 'falhou' ? <span>Não foi possível copiar. Selecione o link e copie.</span> : null}
          </div>
        </section>
      )}
    </>
  );
}
