import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import estilos from './jogador.module.css';

interface Props {
  salvo: boolean;
  inicioAlterado: boolean;
  /** Mensagem da recusa de exclusão por histórico; `null` quando não houve. */
  recusadaPorHistorico: string | null;
  falhaNaSituacao: boolean;
  aoInativarEmVezDeExcluir: () => void;
}

/** Faixas de aviso do cadastro/ficha do jogador, na ordem em que aparecem sob o título. */
export function FaixasDaFicha({
  salvo,
  inicioAlterado,
  recusadaPorHistorico,
  falhaNaSituacao,
  aoInativarEmVezDeExcluir,
}: Props) {
  return (
    <>
      {salvo ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">Jogador salvo</Faixa>
        </div>
      ) : null}
      {inicioAlterado ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">Data de início alterada</Faixa>
        </div>
      ) : null}
      {recusadaPorHistorico ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={aoInativarEmVezDeExcluir}>
              Inativar em vez disso
            </Botao>
          }
        >
          {recusadaPorHistorico}
        </Faixa>
      ) : null}
      {falhaNaSituacao ? (
        <Faixa tipo="erro">Não foi possível concluir. Verifique a conexão e tente de novo.</Faixa>
      ) : null}
    </>
  );
}
