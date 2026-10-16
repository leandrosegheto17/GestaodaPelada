import type { ReactNode } from 'react';

/** Catálogo único de ícones do app (traços copiados do mockup). Novos ícones entram aqui. */
const ICONES = {
  atencao: {
    traco: 2.2,
    desenho: (
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  },
  sucesso: { traco: 2.5, desenho: <path d="M20 6 9 17l-5-5" /> },
  info: {
    traco: 2.2,
    desenho: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
  },
  fechar: { traco: 2.5, desenho: <path d="M18 6 6 18M6 6l12 12" /> },
  baixar: { traco: 2.2, desenho: <path d="M12 5v14M19 12l-7 7-7-7" /> },
  subir: { traco: 2.2, desenho: <path d="M12 19V5M5 12l7-7 7 7" /> },
  atualizar: { traco: 2.2, desenho: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /> },
} satisfies Record<string, { traco: number; desenho: ReactNode }>;

export type NomeIcone = keyof typeof ICONES | 'erro';

interface Props {
  nome: NomeIcone;
  tamanho?: number;
}

export function Icone({ nome, tamanho = 20 }: Props) {
  const { traco, desenho } = ICONES[nome === 'erro' ? 'atencao' : nome];
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {desenho}
    </svg>
  );
}
