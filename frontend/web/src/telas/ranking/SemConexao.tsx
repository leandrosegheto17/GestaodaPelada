import { BarraTitulo } from '../../componentes/barras/BarraTitulo';
import { Botao } from '../../componentes/basicos/Botao';
import { TelaMensagem } from '../../componentes/basicos/TelaMensagem';

interface Props {
  aoTentar: () => void;
}

/** Erro de rede ou de servidor sem dados guardados no aparelho. */
export function SemConexao({ aoTentar }: Props) {
  return (
    <>
      <title>Sem conexão</title>
      <BarraTitulo titulo="Gestão da Pelada" />
      <TelaMensagem
        icone="semConexao"
        titulo="Sem conexão"
        texto="Conecte-se para ver o ranking."
        alerta
        acao={
          <Botao variante="secundario" onClick={aoTentar}>
            Tentar de novo
          </Botao>
        }
      />
    </>
  );
}
