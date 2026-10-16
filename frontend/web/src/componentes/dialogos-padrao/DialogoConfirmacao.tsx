import { useRef, useState } from 'react';
import { Botao } from '../basicos/Botao';
import { CampoTexto } from '../campos/CampoTexto';
import { Dialogo } from '../dialogos/Dialogo';

interface Props {
  titulo: string;
  texto: string;
  /** Verbo explícito da ação (ex.: "Excluir partida"). */
  verbo: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  carregando?: boolean;
  /** Texto do botão que desiste (padrão "Cancelar"). */
  rotuloCancelar?: string;
  /** O botão só habilita depois de digitar o nome exato (espaços nas pontas são ignorados). */
  confirmarDigitando?: { nome: string };
}

/** D2: confirmação destrutiva. Foco em "Cancelar"; Esc equivale a "Cancelar". */
export function DialogoConfirmacao({
  titulo,
  texto,
  verbo,
  aoConfirmar,
  aoCancelar,
  carregando = false,
  rotuloCancelar = 'Cancelar',
  confirmarDigitando,
}: Props) {
  const cancelar = useRef<HTMLButtonElement>(null);
  const [digitado, setDigitado] = useState('');
  const liberado = !confirmarDigitando || digitado.trim() === confirmarDigitando.nome;
  return (
    <Dialogo
      titulo={titulo}
      descricao={texto}
      destrutivo
      fecharComEsc
      refFocoInicial={cancelar}
      aoFechar={aoCancelar}
      acoes={
        <>
          <Botao ref={cancelar} variante="secundario" onClick={aoCancelar}>
            {rotuloCancelar}
          </Botao>
          <Botao variante="destrutivo" disabled={!liberado} carregando={carregando} onClick={aoConfirmar}>
            {verbo}
          </Botao>
        </>
      }
    >
      {confirmarDigitando ? (
        <CampoTexto
          rotulo="Digite o nome do grupo para confirmar"
          valor={digitado}
          aoMudar={setDigitado}
          autoComplete="off"
        />
      ) : null}
    </Dialogo>
  );
}
