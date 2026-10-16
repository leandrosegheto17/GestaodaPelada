import { useEffect, useState } from 'react';

/** O valor só passa depois de `ms` sem mudar (debounce): cada mudança reinicia a contagem. */
export function usarValorAtrasado<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(timer);
  }, [valor, ms]);
  return atrasado;
}
