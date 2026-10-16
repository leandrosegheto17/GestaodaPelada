import { esqueciSenhaResposta, LIMITES } from '@pelada/contrato';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { Formulario } from '../../componentes/pagina/Formulario';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import { escrever } from '../../dados/cliente';
import { lerDestino } from '../../dados/destino';
import { ErroApi, ErroResposta } from '../../dados/erros';

const TEXTO_FIXO = 'Solicite o reset de senha a outro admin.';

/**
 * Qualquer resposta da API (inclusive 4xx) leva à mesma tela, para não revelar se o e-mail existe.
 * Só falha de conexão e erro de servidor (5xx) não dizem nada sobre o e-mail e mostram o erro de envio.
 */
function ehFalhaDeConexao(erro: unknown): boolean {
  if (erro instanceof ErroApi || erro instanceof ErroResposta) return erro.status >= 500;
  return true;
}

/** T05: esqueci a senha. A resposta é sempre a mesma, exista ou não o e-mail. */
export function Component() {
  const [parametros] = useSearchParams();
  const destino = lerDestino(parametros.get('destino'));
  const rotaEntrar = destino ? `/entrar?destino=${encodeURIComponent(destino)}` : '/entrar';

  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  // Troca do formulário pela mensagem: leva o foco ao conteúdo para o leitor de tela perceber.
  useEffect(() => {
    if (enviado) document.getElementById('conteudo')?.focus();
  }, [enviado]);

  const enviar = async () => {
    setFalhou(false);
    setEnviando(true);
    try {
      await escrever('POST', '/sessao/esqueci-senha', { email }, esqueciSenhaResposta);
      setEnviado(true);
    } catch (erro) {
      if (ehFalhaDeConexao(erro)) setFalhou(true);
      else setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <PaginaFormulario titulo="Esqueci a senha">
        <Faixa tipo="info">{TEXTO_FIXO}</Faixa>
        <BotaoLink to={rotaEntrar} variante="secundario" bloco>
          Voltar para entrar
        </BotaoLink>
      </PaginaFormulario>
    );
  }
  return (
    <PaginaFormulario titulo="Esqueci a senha" voltarPara={rotaEntrar} voltarRotulo="Voltar para entrar">
      <Formulario aoEnviar={() => void enviar()} enviando={enviando}>
        <CampoTexto
          rotulo="E-mail"
          tipo="email"
          autoComplete="username"
          maxLength={LIMITES.emailMax}
          valor={email}
          aoMudar={setEmail}
          id="email"
        />
        {falhou ? <ErroEnvio /> : null}
        <Botao type="submit" bloco carregando={enviando} rotuloCarregando="Enviando…">
          Enviar pedido
        </Botao>
      </Formulario>
    </PaginaFormulario>
  );
}
