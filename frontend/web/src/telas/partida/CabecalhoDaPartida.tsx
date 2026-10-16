import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { CampoData } from '../../componentes/campos/CampoData';
import { Interruptor } from '../../componentes/escolhas/Interruptor';
import { diaMes } from '../../formatacao';
import estilos from './partida.module.css';

interface Props {
  data: string;
  /** Maior data aceita (o "hoje" da API). */
  max: string | undefined;
  aoMudarData: (data: string) => void;
  choveu: boolean;
  aoMudarChoveu: (choveu: boolean) => void;
  /** Erro da data (futura, duplicada); com `dataExistente`, oferece abrir a partida que já existe. */
  erroData?: string | undefined;
  dataExistente?: string | undefined;
  /** Rota de edição de uma data existente. */
  rotaEditar: (data: string) => string;
}

/** Data e "Choveu?": ficam na tela em todos os estados (carregando, lista, erro da data). */
export function CabecalhoDaPartida({
  data,
  max,
  aoMudarData,
  choveu,
  aoMudarChoveu,
  erroData,
  dataExistente,
  rotaEditar,
}: Props) {
  return (
    <div className={estilos.duasColunas}>
      <div>
        <CampoData
          rotulo="Data"
          id="data"
          valor={data}
          aoMudar={aoMudarData}
          max={max}
          erro={erroData}
          erroComoAlerta
        />
        {dataExistente ? (
          <div className={estilos.acima3}>
            <BotaoLink to={rotaEditar(dataExistente)} variante="secundario">
              Editar a partida de {diaMes(dataExistente)}
            </BotaoLink>
          </div>
        ) : null}
      </div>
      <Interruptor rotulo="Choveu?" marcado={choveu} aoMudar={aoMudarChoveu} textoLigado="Sim" textoDesligado="Não" />
    </div>
  );
}
