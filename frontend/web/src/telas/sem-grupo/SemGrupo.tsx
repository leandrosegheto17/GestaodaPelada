import { BarraTitulo } from '../../componentes/barras/BarraTitulo';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { TelaMensagem } from '../../componentes/basicos/TelaMensagem';

const TITULO = 'Abra o link do seu grupo';

/** T02: quem chega sem link nem grupo lembrado. */
export function Component() {
  return (
    <>
      <title>{TITULO}</title>
      <BarraTitulo titulo="Gestão da Pelada" />
      <TelaMensagem
        icone="link"
        titulo={TITULO}
        texto="Peça o link do ranking ao admin do seu grupo de pelada."
        acao={
          <BotaoLink to="/entrar" variante="texto">
            Já tenho login de admin
          </BotaoLink>
        }
      />
    </>
  );
}
