import { useLocation, useNavigate } from 'react-router';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import estilos from './privacidade.module.css';

/** T07: aviso de privacidade. Página pública, só com texto fixo (nada da sessão). */
export function Component() {
  const navegar = useNavigate();
  const { key } = useLocation();
  // Veio de outra tela do app (ranking, menu, diálogo): volta para ela; aberta direto, vai ao início.
  const aoVoltar = key !== 'default' ? () => void navegar(-1) : undefined;
  return (
    <PaginaFormulario titulo="Privacidade" voltarPara="/" voltarRotulo="Voltar" {...(aoVoltar ? { aoVoltar } : {})}>
      <h2 className={estilos.subtitulo}>O que guardamos</h2>
      <p className={estilos.paragrafo}>
        Do jogador: apelido, ano de nascimento, posição, telefone (opcional), data de entrada no grupo, presenças nas
        partidas e as notas de habilidade dadas pelos admins. Dos admins: nome, e-mail e senha, guardada de um jeito que
        ninguém consegue ler. Do uso do app: contagens anônimas, sem nome, telefone, IP nem localização.
      </p>
      <h2 className={estilos.subtitulo}>Quem vê</h2>
      <p className={estilos.paragrafo}>
        Qualquer pessoa com o link do grupo vê o ranking: apelido, colocação e pontos. Telefone, idade, posição em
        campo, notas, nível e o caixa ficam só com os admins do grupo.
      </p>
      <h2 className={estilos.subtitulo}>Como pedir a exclusão</h2>
      <p className={estilos.paragrafo}>Fale com o admin do seu grupo. Ele pode excluir ou inativar o seu cadastro.</p>
    </PaginaFormulario>
  );
}
