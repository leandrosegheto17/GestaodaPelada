import type { PreviaSimulador } from '@pelada/contrato';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { juntar } from '../../componentes/basicos/juntar';
import estilos from './simulador.module.css';

/** O que a prévia mostra agora; o texto de uma prévia pronta é sempre o `descricao` da API. */
export type SituacaoPrevia =
  | { tipo: 'sem-aptos' }
  | { tipo: 'calculando' }
  | { tipo: 'falha'; aoTentar: () => void }
  | { tipo: 'pronta'; previa: PreviaSimulador };

export const ID_RAZAO = 'previa-erro';

export const MENSAGEM_SEM_APTOS = 'Marque os aptos.';

/** Texto que explica por que "Sugerir times" está desabilitado, ou `null` quando está liberado. */
export function razaoDoBloqueio(situacao: SituacaoPrevia): string | null {
  switch (situacao.tipo) {
    case 'sem-aptos':
      return MENSAGEM_SEM_APTOS;
    case 'falha':
      return 'Não foi possível calcular a prévia.';
    case 'pronta':
      return situacao.previa.valida ? null : situacao.previa.descricao;
    case 'calculando':
      return null;
  }
}

/** Cartão "Prévia" (região `aria-live`) e, quando há problema, a faixa de erro ligada ao botão. */
export function CartaoPrevia({ situacao }: { situacao: SituacaoPrevia }) {
  const calculando = situacao.tipo === 'calculando';
  const razao = razaoDoBloqueio(situacao);
  return (
    <>
      <div className={estilos.cartao} aria-live="polite" aria-busy={calculando || undefined}>
        <p className={estilos.rotuloPrevia}>Prévia</p>
        {situacao.tipo === 'pronta' && situacao.previa.valida ? (
          <p className={estilos.previa}>{situacao.previa.descricao}</p>
        ) : null}
        {calculando ? <p className={juntar(estilos.previa, estilos.recalculando)}>calculando…</p> : null}
        {situacao.tipo === 'sem-aptos' ? (
          <p id={ID_RAZAO} className={estilos.previa}>
            {MENSAGEM_SEM_APTOS}
          </p>
        ) : null}
      </div>
      {razao && situacao.tipo !== 'sem-aptos' ? (
        <div id={ID_RAZAO}>
          <Faixa
            tipo="erro"
            acao={
              situacao.tipo === 'falha' ? (
                <Botao variante="texto" onClick={situacao.aoTentar}>
                  Tentar de novo
                </Botao>
              ) : undefined
            }
          >
            {razao}
          </Faixa>
        </div>
      ) : null}
    </>
  );
}
