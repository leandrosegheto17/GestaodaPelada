import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CampoSenha } from '../../componentes/campos/CampoSenha';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { AjudaDoFormulario, Formulario } from '../../componentes/pagina/Formulario';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import { destinoAposEntrar } from '../../app/guarda/decidir-rota';
import { escrever, semCorpo } from '../../dados/cliente';
import { lerDestino } from '../../dados/destino';
import { chaveSessao, lerSessao, useSessao } from '../../dados/sessao';
import { falhaDeEntrar, type FalhaEntrar } from './mensagensEntrar';

/** T04: entrar com e-mail e senha. Para onde ir depois é decidido só por `destinoAposEntrar`. */
export function Component() {
  const [parametros] = useSearchParams();
  const destino = lerDestino(parametros.get('destino'));
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const sessao = useSessao();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<FalhaEntrar | null>(null);

  if (sessao.isPending) return null;
  if (sessao.data) return <Navigate to={destinoAposEntrar(sessao.data, destino)} replace />;

  const entrar = async () => {
    setFalha(null);
    setEnviando(true);
    try {
      await escrever('POST', '/sessao/entrar', { email, senha }, semCorpo);
      const nova = await cliente.fetchQuery({ queryKey: chaveSessao, queryFn: lerSessao, staleTime: 0 });
      if (!nova) throw new Error('Sessão não encontrada depois de entrar.');
      void navegar(destinoAposEntrar(nova, destino), { replace: true });
    } catch (erro) {
      setFalha(falhaDeEntrar(erro));
      setSenha('');
    } finally {
      setEnviando(false);
    }
  };

  const sufixoDestino = destino ? `?destino=${encodeURIComponent(destino)}` : '';
  return (
    <PaginaFormulario titulo="Entrar" voltarPara="/" voltarRotulo="Voltar ao ranking">
      <Formulario aoEnviar={() => void entrar()} enviando={enviando}>
        <CampoTexto rotulo="E-mail" tipo="email" autoComplete="username" valor={email} aoMudar={setEmail} id="email" />
        <CampoSenha rotulo="Senha" autoComplete="current-password" valor={senha} aoMudar={setSenha} id="senha" />
        <AjudaDoFormulario>No iPhone, o app instalado e o Safari pedem login separadamente.</AjudaDoFormulario>
        {falha?.tipo === 'mensagem' ? <Faixa tipo="erro">{falha.texto}</Faixa> : null}
        {falha?.tipo === 'conexao' ? <ErroEnvio /> : null}
        <Botao type="submit" bloco carregando={enviando} rotuloCarregando="Entrando…">
          Entrar
        </Botao>
        <BotaoLink to={`/entrar/esqueci${sufixoDestino}`} variante="texto">
          Esqueci a senha
        </BotaoLink>
      </Formulario>
    </PaginaFormulario>
  );
}
