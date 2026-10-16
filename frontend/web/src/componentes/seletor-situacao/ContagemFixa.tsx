import type { SituacaoPresenca } from '@pelada/contrato';
import { useEffect, useState } from 'react';
import { ORDEM_CONTAGEM, ROTULO_SITUACAO_PRESENCA } from '../../rotulos';
import estilos from './ContagemFixa.module.css';

const ATRASO_ANUNCIO_MS = 800;

interface Props {
  contagem: Record<SituacaoPresenca, number>;
}

/** Texto visível na hora; o anúncio para leitor de tela espera as mudanças seguidas pararem. */
export function ContagemFixa({ contagem }: Props) {
  const texto = ORDEM_CONTAGEM.map((s) => `${ROTULO_SITUACAO_PRESENCA[s].plural} ${contagem[s]}`).join(' · ');
  const [anunciado, setAnunciado] = useState(texto);
  useEffect(() => {
    const timer = setTimeout(() => setAnunciado(texto), ATRASO_ANUNCIO_MS);
    return () => clearTimeout(timer);
  }, [texto]);
  return (
    <>
      <p className={estilos.contagem} aria-hidden="true">
        {texto}
      </p>
      <p className="sr" aria-live="polite" aria-atomic="true">
        {anunciado}
      </p>
    </>
  );
}
