import { adicionarAdminCorpo } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import estilos from './admins.module.css';

interface Props {
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  /** Muda quando o envio deu certo: limpa os campos. */
  versaoLimpa: number;
  aoAdicionar: (corpo: { nome: string; email: string }) => void;
}

/** Nome e e-mail do novo admin. Valida com o contrato antes de enviar. */
export function FormularioAdicionarAdmin({ errosDoServidor, enviando, semConexao, versaoLimpa, aoAdicionar }: Props) {
  return (
    <Campos
      key={versaoLimpa}
      errosDoServidor={errosDoServidor}
      enviando={enviando}
      semConexao={semConexao}
      aoAdicionar={aoAdicionar}
    />
  );
}

function Campos({ errosDoServidor, enviando, semConexao, aoAdicionar }: Omit<Props, 'versaoLimpa'>) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  const erros = { ...errosDoServidor, ...errosLocais };
  const itens = [
    ...(erros.nome ? [{ idCampo: 'admin-nome', rotulo: 'Nome' }] : []),
    ...(erros.email ? [{ idCampo: 'admin-email', rotulo: 'E-mail' }] : []),
  ];

  const enviar = () => {
    const analise = adicionarAdminCorpo.safeParse({ nome, email });
    if (!analise.success) {
      setErrosLocais(deValidacao(analise));
      return;
    }
    setErrosLocais({});
    aoAdicionar(analise.data);
  };

  return (
    <form
      className={estilos.formulario}
      noValidate
      aria-busy={enviando || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <ResumoErros erros={itens} />
      <CampoTexto
        id="admin-nome"
        rotulo="Nome"
        autoComplete="off"
        erro={erros.nome}
        erroComoAlerta={itens.length === 1}
        valor={nome}
        aoMudar={setNome}
      />
      <CampoTexto
        id="admin-email"
        rotulo="E-mail"
        tipo="email"
        autoComplete="off"
        erro={erros.email}
        erroComoAlerta={itens.length === 1}
        valor={email}
        aoMudar={setEmail}
      />
      {semConexao ? <ErroEnvio /> : null}
      <div>
        <Botao type="submit" carregando={enviando}>
          Adicionar admin
        </Botao>
      </div>
    </form>
  );
}
