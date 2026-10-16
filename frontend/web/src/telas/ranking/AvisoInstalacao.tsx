import { useEffect, useState } from 'react';
import { Faixa } from '../../componentes/basicos/Faixa';
import { lerAmbienteEDecidir } from '../../pwa/instalacao';
import { avisoInstalacaoFechado, fecharAvisoInstalacao } from '../../pwa/armazenamento';

/** Como instalar o app no iPhone: só no Safari do iOS, fora do app instalado, e some de vez ao fechar. */
export function AvisoInstalacao() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!lerAmbienteEDecidir()) return;
    avisoInstalacaoFechado()
      .catch(() => false)
      .then((fechado) => {
        if (ativo && !fechado) setVisivel(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (!visivel) return null;
  const fechar = () => {
    setVisivel(false);
    document.getElementById('conteudo')?.focus();
    void fecharAvisoInstalacao().catch(() => undefined);
  };
  return (
    <Faixa tipo="info" topo papel="note" aoFechar={fechar} rotuloFechar="Fechar aviso de instalação">
      Instale: toque em Compartilhar e depois em {'“'}Adicionar à Tela de Início{'”'}.
    </Faixa>
  );
}
