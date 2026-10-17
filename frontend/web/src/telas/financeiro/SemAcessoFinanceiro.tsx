import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { TelaMensagem } from '../../componentes/basicos/TelaMensagem';

/** 403 do financeiro: o admin é do grupo, mas não tem a permissão do caixa. */
export function SemAcessoFinanceiro({ base }: { base: string }) {
  return (
    <>
      <title>Financeiro: sem acesso</title>
      <TelaMensagem
        icone="cadeado"
        titulo="Sem acesso"
        texto="Você não tem acesso ao financeiro deste grupo. Peça a um admin com acesso."
        alerta
        acao={
          <BotaoLink to={base} variante="secundario">
            Voltar
          </BotaoLink>
        }
      />
    </>
  );
}
