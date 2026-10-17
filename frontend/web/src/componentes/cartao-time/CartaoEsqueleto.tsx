import { FormaEsqueleto } from '../basicos/Esqueleto';
import { juntar } from '../basicos/juntar';
import estilos from './CartaoTime.module.css';

/** Cartão de time vazio, com o esqueleto de título e linhas, para a espera da sugestão. */
export function CartaoEsqueleto({ variante }: { variante?: 'B' }) {
  return (
    <div className={juntar(estilos.cartao, variante === 'B' && estilos.b)}>
      <FormaEsqueleto variante="titulo" />
      <FormaEsqueleto variante="linha" quantidade={5} />
    </div>
  );
}
