import type { EntradaSimulador } from '@pelada/contrato';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import estilos from './resultado.module.css';

interface Props {
  /** Recálculo pendente, falha de recálculo ou confirmação em andamento. */
  confirmarDesabilitado: boolean;
  confirmando: boolean;
  aoConfirmar: () => void;
  aoRefazer: () => void;
  /** Rota da T12 (Editar entradas leva a mesma entrada de volta). */
  destinoEditar: string;
  entrada: EntradaSimulador;
}

/** Confirmar, Refazer e Editar entradas: comum à T13 e à T14. */
export function BarraResultado({
  confirmarDesabilitado,
  confirmando,
  aoConfirmar,
  aoRefazer,
  destinoEditar,
  entrada,
}: Props) {
  return (
    <BarraAcao>
      <div className={estilos.acoes}>
        <Botao variante="principal" disabled={confirmarDesabilitado} carregando={confirmando} onClick={aoConfirmar}>
          Confirmar escalação
        </Botao>
        <Botao variante="secundario" onClick={aoRefazer}>
          Refazer sugestão
        </Botao>
        <BotaoLink to={destinoEditar} state={{ entrada }} variante="texto">
          Editar entradas
        </BotaoLink>
      </div>
    </BarraAcao>
  );
}
