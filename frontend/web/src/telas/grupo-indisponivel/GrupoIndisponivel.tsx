import { BarraTitulo } from '../../componentes/barras/BarraTitulo';
import { TelaMensagem } from '../../componentes/basicos/TelaMensagem';

/** T03: a mesma tela para grupo arquivado e link inexistente (RF-09). Não mostra nada da API. */
export function GrupoIndisponivel() {
  return (
    <>
      <title>Grupo indisponível</title>
      <BarraTitulo titulo="Gestão da Pelada" />
      <TelaMensagem
        icone="proibido"
        titulo="Grupo indisponível"
        texto="Este grupo não está disponível no momento. Fale com o admin do seu grupo."
      />
    </>
  );
}
