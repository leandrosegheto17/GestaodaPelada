import { Botao } from '../basicos/Botao';
import { BotaoLink } from '../basicos/BotaoLink';
import { ErroEnvio } from '../basicos/ErroEnvio';
import { Dialogo } from '../dialogos/Dialogo';
import estilos from './DialogoPrivacidade.module.css';

interface Props {
  aoEntender: () => void;
  enviando: boolean;
  /** A última tentativa de marcar como visto falhou: o diálogo continua aberto. */
  erro: boolean;
}

/** Aviso de privacidade do 1º acesso do admin (RF-64). Só "Entendi" marca como visto; Esc não fecha. */
export function DialogoPrivacidade({ aoEntender, enviando, erro }: Props) {
  return (
    <Dialogo
      titulo="Privacidade"
      focoNoTitulo
      fecharComEsc={false}
      aoFechar={() => undefined}
      acoes={
        <Botao variante="principal" carregando={enviando} onClick={aoEntender}>
          Entendi
        </Botao>
      }
    >
      <p className={estilos.texto}>
        <strong>O que guardamos:</strong> dados de cadastro dos jogadores e dos admins, as partidas e contagens anônimas
        de uso.
      </p>
      <p className={estilos.texto}>
        <strong>Quem vê:</strong> o público vê apelido, colocação e pontos; os admins veem o resto.
      </p>
      <p className={estilos.texto}>
        <strong>Exclusão:</strong> o jogador pede ao admin do grupo.
      </p>
      <BotaoLink to="/privacidade" variante="texto">
        Ler o aviso completo
      </BotaoLink>
      {erro ? <ErroEnvio /> : null}
    </Dialogo>
  );
}
