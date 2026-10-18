import { useState } from 'react';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';

/** Refazer direto, ou pede confirmação antes de descartar quando houve ajuste manual. */
export function useRefazer(houveAjuste: boolean, aoRefazer: () => void) {
  const [descartando, setDescartando] = useState(false);

  const aoPedirRefazer = () => {
    if (houveAjuste) setDescartando(true);
    else aoRefazer();
  };

  const dialogoRefazer = descartando ? (
    <DialogoConfirmacao
      {...textosConfirmacao.refazerSugestao()}
      aoConfirmar={() => {
        setDescartando(false);
        aoRefazer();
      }}
      aoCancelar={() => setDescartando(false)}
    />
  ) : null;

  return { aoPedirRefazer, dialogoRefazer };
}
