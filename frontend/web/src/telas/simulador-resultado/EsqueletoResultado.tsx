import { FormaEsqueleto } from '../../componentes/basicos/Esqueleto';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import estilos from './resultado.module.css';

/** Enquanto a sugestão é montada: "Montando os times…" e dois cartões de esqueleto. */
export function EsqueletoResultado() {
  return (
    <div aria-busy="true">
      <TituloPagina>Montando os times…</TituloPagina>
      <p className="sr" role="status">
        Montando os times…
      </p>
      <div className={`${estilos.times} ${estilos.timesDois}`} aria-hidden="true">
        <FormaEsqueleto variante="bloco" quantidade={3} />
        <FormaEsqueleto variante="bloco" quantidade={3} />
      </div>
    </div>
  );
}
