import { LIMITES } from '@pelada/contrato';
import { CaixaSelecao, Segmentado } from '../../componentes/escolhas';
import { CampoData } from '../../componentes/campos/CampoData';
import { CampoNumero } from '../../componentes/campos/CampoNumero';
import { ORDEM_FORMATO_SIMULADOR, rotuloFormatoSimulador } from '../../rotulos';
import type { Acao, EstadoEntradas } from './estadoEntradas';

interface Props {
  estado: EstadoEntradas;
  /** Data em uso (a escolhida ou a sugerida). */
  data: string;
  dataSugerida: string;
  despachar: (acao: Acao) => void;
}

const OPCOES = ORDEM_FORMATO_SIMULADOR.map((valor) => ({ valor, rotulo: rotuloFormatoSimulador(valor) }));

/** Data, formato, jogadores por time e limite de substituições (só em 2 times). */
export function FormEntradas({ estado, data, dataSugerida, despachar }: Props) {
  const dois = estado.formato === 'dois_times';
  return (
    <>
      <CampoData
        id="data"
        rotulo="Data da partida"
        valor={data}
        aoMudar={(nova) => despachar({ tipo: 'data', data: nova === '' || nova === dataSugerida ? null : nova })}
        {...(data === dataSugerida ? { ajuda: 'Próximo dia de jogo.' } : {})}
      />
      <Segmentado
        legenda="Formato"
        opcoes={OPCOES}
        valor={estado.formato}
        aoMudar={(formato) => despachar({ tipo: 'formato', formato })}
      />
      <CampoNumero
        id="n"
        rotulo="Jogadores por time"
        valor={estado.n}
        min={LIMITES.jogadoresPorTime.min}
        max={LIMITES.jogadoresPorTime.max}
        rotuloDiminuir="Diminuir jogadores por time"
        rotuloAumentar="Aumentar jogadores por time"
        aoMudar={(n) => despachar({ tipo: 'n', n })}
      />
      {dois ? (
        <CampoNumero
          id="k"
          rotulo="Limite de substituições por time"
          valor={estado.k}
          min={LIMITES.substituicoes.min}
          max={LIMITES.substituicoes.max}
          rotuloDiminuir="Diminuir limite"
          rotuloAumentar="Aumentar limite"
          desabilitado={estado.ilimitado}
          aoMudar={(k) => despachar({ tipo: 'k', k })}
          aoLado={
            <CaixaSelecao
              rotulo="Ilimitado"
              marcada={estado.ilimitado}
              aoMudar={(ilimitado) => despachar({ tipo: 'ilimitado', ilimitado })}
            />
          }
        />
      ) : null}
    </>
  );
}
