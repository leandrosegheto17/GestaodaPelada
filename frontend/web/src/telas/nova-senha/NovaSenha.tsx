import { trocarSenhaCorpo } from '@pelada/contrato';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CamposNovaSenha, ID_CONFIRMACAO, ID_NOVA_SENHA } from '../../componentes/campos/CamposNovaSenha';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { Formulario } from '../../componentes/pagina/Formulario';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import { destinoAposEntrar } from '../../app/guarda/decidir-rota';
import { escrever, semCorpo } from '../../dados/cliente';
import { lerDestino } from '../../dados/destino';
import { deErroApi, deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ErroApi } from '../../dados/erros';
import { chaveSessao, lerSessao, useSair, useSessao } from '../../dados/sessao';

/** T06: troca de senha obrigatória no primeiro acesso. A única saída é "Sair". */
export function Component() {
  const [parametros] = useSearchParams();
  const destino = lerDestino(parametros.get('destino'));
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const sessao = useSessao();
  const sair = useSair();

  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<ErrosDeCampos>({});
  const [enviando, setEnviando] = useState(false);
  const [semConexao, setSemConexao] = useState(false);

  if (sessao.isPending) return null;
  // Esta tela só serve à troca obrigatória: com a sessão completa, segue para a área.
  if (sessao.data && sessao.data.escopo === 'completo') {
    return <Navigate to={destinoAposEntrar(sessao.data, destino)} replace />;
  }

  const salvar = async () => {
    setSemConexao(false);
    const analise = trocarSenhaCorpo.safeParse({ novaSenha: nova, confirmacao });
    if (!analise.success) {
      setErros(deValidacao(analise));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await escrever('POST', '/sessao/trocar-senha', analise.data, semCorpo);
      const atualizada = await cliente.fetchQuery({ queryKey: chaveSessao, queryFn: lerSessao, staleTime: 0 });
      if (!atualizada) throw new Error('Sessão não encontrada depois de trocar a senha.');
      void navegar(destinoAposEntrar(atualizada, destino), { replace: true });
    } catch (erro) {
      const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
      if (doCampo) setErros(doCampo);
      else setSemConexao(true);
    } finally {
      setEnviando(false);
    }
  };

  const itens = [
    ...(erros.novaSenha ? [{ idCampo: ID_NOVA_SENHA, rotulo: 'Nova senha' }] : []),
    ...(erros.confirmacao ? [{ idCampo: ID_CONFIRMACAO, rotulo: 'Confirmar nova senha' }] : []),
  ];
  return (
    <PaginaFormulario titulo="Crie sua senha">
      <p>Por segurança, crie sua senha antes de continuar.</p>
      <Formulario aoEnviar={() => void salvar()} enviando={enviando}>
        <ResumoErros erros={itens} />
        <CamposNovaSenha
          nova={nova}
          confirmacao={confirmacao}
          aoMudarNova={setNova}
          aoMudarConfirmacao={setConfirmacao}
          erros={erros}
        />
        {semConexao ? <ErroEnvio /> : null}
        <Botao type="submit" bloco carregando={enviando} rotuloCarregando="Salvando…">
          Salvar e continuar
        </Botao>
        <Botao
          variante="texto"
          onClick={() => sair.mutate(undefined, { onSuccess: () => void navegar('/entrar', { replace: true }) })}
        >
          Sair
        </Botao>
      </Formulario>
    </PaginaFormulario>
  );
}
