import { useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Selo } from '../../componentes/basicos/Selo';
import { compartilharLink, copiarLink, type ResultadoCompartilhar } from './compartilhar';
import estilos from './grupo.module.css';

interface Props {
  nomeDoGrupo: string;
  /** Exatamente o `urlPublica` da API (nada é montado na tela). */
  url: string;
}

/** Link do ranking com Copiar e Compartilhar. */
export function CartaoLink({ nomeDoGrupo, url }: Props) {
  const idTitulo = useId();
  const idUrl = useId();
  const [resultado, setResultado] = useState<ResultadoCompartilhar | null>(null);
  return (
    <section className={estilos.cartao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.subtituloSemTopo}>
        Link do ranking
      </h2>
      <p id={idUrl} className={estilos.paragrafo}>
        <strong>{url}</strong>
      </p>
      <div className={estilos.grupoBotoes}>
        <Botao variante="secundario" aria-describedby={idUrl} onClick={() => void copiarLink(url).then(setResultado)}>
          Copiar link
        </Botao>
        <Botao
          variante="secundario"
          aria-describedby={idUrl}
          onClick={() => void compartilharLink(nomeDoGrupo, url).then(setResultado)}
        >
          Compartilhar
        </Botao>
      </div>
      <div role="status" className={estilos.estado}>
        {resultado === 'copiado' ? <Selo tom="sucesso">Link copiado</Selo> : null}
        {resultado === 'falhou' ? <span>Não foi possível copiar. Selecione o link e copie.</span> : null}
      </div>
    </section>
  );
}
