import { juntar } from '../basicos/juntar';
import estilos from './Ranking.module.css';

interface Props {
  choveu: boolean;
  tamanho?: number;
}

/** Sol (sem chuva) ou nuvem com chuva. Decorativo: o texto vem ao lado, em `.sr` ou visível. */
export function IconeTempo({ choveu, tamanho = 16 }: Props) {
  return (
    <svg
      className={juntar('icone', estilos.iconeTempo, choveu ? estilos.chuva : estilos.sol)}
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {choveu ? (
        <>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <path d="M8 13v2M8 19v2M12 15v2M12 21v2M16 13v2M16 19v2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
    </svg>
  );
}
