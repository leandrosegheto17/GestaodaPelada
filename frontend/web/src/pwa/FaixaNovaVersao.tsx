import { useRegisterSW } from 'virtual:pwa-register/react';
import { Botao } from '../componentes/basicos/Botao';
import { Faixa } from '../componentes/basicos/Faixa';

/** Aviso de versão nova do app: o usuário decide quando recarregar. */
export function FaixaNovaVersao() {
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();
  if (!precisaAtualizar) return null;
  return (
    <Faixa
      tipo="info"
      topo
      acao={
        <Botao variante="texto" onClick={() => void updateServiceWorker(true)}>
          Recarregar
        </Botao>
      }
    >
      Nova versão.
    </Faixa>
  );
}
