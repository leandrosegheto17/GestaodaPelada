import { Botao } from '../../componentes/basicos/Botao';
import { Dialogo } from '../../componentes/dialogos/Dialogo';

interface Props {
  /** Ex.: "Ranking de outubro de 2026 da Pelada de Quinta." */
  descricao: string;
  aoCompartilhar: () => void;
  aoBaixar: () => void;
  aoFechar: () => void;
}

/** D4: o navegador recusou o compartilhamento direto; um novo toque no gesto da pessoa resolve. */
export function DialogoPdfPronto({ descricao, aoCompartilhar, aoBaixar, aoFechar }: Props) {
  return (
    <Dialogo
      titulo="PDF pronto."
      descricao={`${descricao}.`}
      aoFechar={aoFechar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoBaixar}>
            Baixar
          </Botao>
          <Botao onClick={aoCompartilhar}>Compartilhar</Botao>
        </>
      }
    />
  );
}
