import { trocarSenhaCorpo } from '@pelada/contrato';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarraAdmin } from '../../componentes/barras/BarraAdmin';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { CamposNovaSenha, ID_CONFIRMACAO, ID_NOVA_SENHA } from '../../componentes/campos/CamposNovaSenha';
import { CampoSenha } from '../../componentes/campos/CampoSenha';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { Formulario } from '../../componentes/pagina/Formulario';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import { escrever, semCorpo } from '../../dados/cliente';
import { deErroApi, deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ErroApi } from '../../dados/erros';
import { useSessao } from '../../dados/sessao';

const ID_ATUAL = 'atual';
const DURACAO_SUCESSO_MS = 4000;

/** T25: trocar a própria senha (exige a atual). A sessão atual continua; a API encerra as outras. */
export function Component() {
  const [parametros] = useSearchParams();
  const sessao = useSessao();

  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<ErrosDeCampos>({});
  const [enviando, setEnviando] = useState(false);
  const [semConexao, setSemConexao] = useState(false);
  const [trocada, setTrocada] = useState(false);

  useEffect(() => {
    if (!trocada) return;
    const timer = setTimeout(() => setTrocada(false), DURACAO_SUCESSO_MS);
    return () => clearTimeout(timer);
  }, [trocada]);

  // O grupo vem de `?grupo=` só se pertencer à conta; senão, o primeiro. Sem grupos (dono puro): /dono.
  const grupos = sessao.data?.grupos ?? [];
  const grupo = grupos.find((g) => g.id === parametros.get('grupo')) ?? grupos[0];
  const inicio = grupo ? `/admin/${encodeURIComponent(grupo.id)}` : '/dono';

  const salvar = async () => {
    setSemConexao(false);
    setTrocada(false);
    const analise = trocarSenhaCorpo.safeParse({ senhaAtual: atual || undefined, novaSenha: nova, confirmacao });
    const invalidos = deValidacao(analise);
    if (!atual) invalidos.senhaAtual = 'Informe a senha atual.';
    if (Object.keys(invalidos).length > 0 || !analise.success) {
      setErros(invalidos);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await escrever('POST', '/sessao/trocar-senha', analise.data, semCorpo);
      setAtual('');
      setNova('');
      setConfirmacao('');
      setTrocada(true);
    } catch (erro) {
      const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
      if (doCampo) setErros(doCampo);
      else setSemConexao(true);
    } finally {
      setEnviando(false);
    }
  };

  const itens = [
    ...(erros.senhaAtual ? [{ idCampo: ID_ATUAL, rotulo: 'Senha atual' }] : []),
    ...(erros.novaSenha ? [{ idCampo: ID_NOVA_SENHA, rotulo: 'Nova senha' }] : []),
    ...(erros.confirmacao ? [{ idCampo: ID_CONFIRMACAO, rotulo: 'Confirmar nova senha' }] : []),
  ];
  const umSoErro = itens.length === 1;
  return (
    <PaginaFormulario
      titulo="Minha senha"
      voltarPara={inicio}
      voltarRotulo="Início"
      barra={<BarraAdmin {...(grupo ? { nomeGrupo: grupo.nome } : {})} />}
    >
      {trocada ? <Faixa tipo="sucesso">Senha trocada. Outros aparelhos foram desconectados.</Faixa> : null}
      <Formulario aoEnviar={() => void salvar()} enviando={enviando}>
        <ResumoErros erros={itens} />
        <CampoSenha
          id={ID_ATUAL}
          rotulo="Senha atual"
          autoComplete="current-password"
          comMostrar={false}
          erro={erros.senhaAtual}
          erroComoAlerta={umSoErro}
          valor={atual}
          aoMudar={setAtual}
        />
        <CamposNovaSenha
          nova={nova}
          confirmacao={confirmacao}
          aoMudarNova={setNova}
          aoMudarConfirmacao={setConfirmacao}
          erros={erros}
          erroComoAlerta={umSoErro}
        />
        {semConexao ? <ErroEnvio /> : null}
        <div>
          <Botao type="submit" carregando={enviando} rotuloCarregando="Salvando…">
            Trocar senha
          </Botao>
        </div>
      </Formulario>
    </PaginaFormulario>
  );
}
