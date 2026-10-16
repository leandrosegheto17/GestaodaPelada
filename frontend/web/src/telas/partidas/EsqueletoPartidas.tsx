import { Esqueleto } from '../../componentes/basicos/Esqueleto';

/** Aparece depois de 300 ms: título, mês e linhas da lista. */
export function EsqueletoPartidas() {
  return (
    <div aria-busy="true">
      <Esqueleto variante="titulo" />
      <Esqueleto variante="mes" />
      <Esqueleto variante="bloco" quantidade={4} />
    </div>
  );
}
