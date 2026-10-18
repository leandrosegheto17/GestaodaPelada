import { mes as esquemaMes } from '@pelada/contrato';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Lê o parâmetro `?mes=` da URL. Se vier malformado, tira o parâmetro (sem entrar no histórico)
 * e a tela segue com o mês corrente. `mesDaUrl` é o valor bruto; só use-o quando `mesValido`.
 */
export function useMesDaUrl() {
  const [parametros, definirParametros] = useSearchParams();
  const mesDaUrl = parametros.get('mes');
  const mesValido = mesDaUrl === null || esquemaMes.safeParse(mesDaUrl).success;

  useEffect(() => {
    if (mesValido) return;
    definirParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        novos.delete('mes');
        return novos;
      },
      { replace: true },
    );
  }, [mesValido, definirParametros]);

  const definirMes = useCallback((mes: string) => definirParametros({ mes }), [definirParametros]);

  return { mesDaUrl, mesValido, definirMes };
}
