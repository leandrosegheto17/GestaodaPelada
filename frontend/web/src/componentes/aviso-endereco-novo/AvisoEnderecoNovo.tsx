import { useLocation } from 'react-router';
import { Faixa } from '../basicos/Faixa';
import { linkEnderecoNovo } from './linkEnderecoNovo';

interface Props {
  /** `enderecoNovo` da API (ranking público ou sessão); nulo = sem aviso. */
  enderecoNovo: string | null | undefined;
}

/** Faixa de atenção, não fechável, com o link da mesma tela no endereço novo. */
export function AvisoEnderecoNovo({ enderecoNovo }: Props) {
  const { pathname, search, hash } = useLocation();
  const link = linkEnderecoNovo(enderecoNovo, pathname + search + hash);
  if (!link) return null;
  return (
    <Faixa tipo="atencao" topo>
      <strong>O app mudou de endereço.</strong>
      <a href={link}>Abrir o novo endereço e reinstalar</a>
    </Faixa>
  );
}
