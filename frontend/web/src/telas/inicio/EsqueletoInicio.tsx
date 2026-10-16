import { Esqueleto } from '../../componentes/basicos/Esqueleto';

/** Enquanto o grupo carrega (aparece depois de 300 ms): o bloco "Dia de jogo" e a lista. */
export function EsqueletoInicio() {
  return (
    <div aria-busy="true">
      <Esqueleto variante="titulo" />
      <Esqueleto variante="botao" quantidade={2} />
      <Esqueleto variante="bloco" quantidade={8} />
    </div>
  );
}
