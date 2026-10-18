import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import estilos from './resultado.module.css';
import { MENSAGEM_FALHA_CONFIRMAR } from './useConfirmacaoEscalacao';

interface Props {
  erroRecalculo: string | null | undefined;
  tentarDeNovo: () => void;
  falhouAoConfirmar: boolean;
}

/** Faixas de erro do recálculo (com "Tentar de novo") e da confirmação, comuns à T13 e à T14. */
export function FaixasDoResultado({ erroRecalculo, tentarDeNovo, falhouAoConfirmar }: Props) {
  return (
    <>
      {erroRecalculo ? (
        <div className={estilos.faixa}>
          <Faixa
            tipo="erro"
            acao={
              <Botao variante="texto" onClick={tentarDeNovo}>
                Tentar de novo
              </Botao>
            }
          >
            {erroRecalculo}
          </Faixa>
        </div>
      ) : null}
      {falhouAoConfirmar ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">{MENSAGEM_FALHA_CONFIRMAR}</Faixa>
        </div>
      ) : null}
    </>
  );
}
