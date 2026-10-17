import { useState } from 'react';
import { useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao, DialogoSenha, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { Lista } from '../../componentes/listas/Lista';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import {
  useAdicionarAdmin,
  useAdmins,
  useFinanceiroAdmin,
  useRedefinirSenha,
  useRemoverAdmin,
} from '../../dados/admins';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { FormularioAdicionarAdmin } from './FormularioAdicionarAdmin';
import { ItemAdmin } from './ItemAdmin';
import estilos from './admins.module.css';

interface SenhaParaMostrar {
  nome: string;
  senha: string;
}

/** T19: admins do grupo. As senhas temporárias só existem no diálogo que as mostra. */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const admins = useAdmins(grupoId);
  const adicionar = useAdicionarAdmin(grupoId);
  const redefinir = useRedefinirSenha(grupoId);
  const remover = useRemoverAdmin(grupoId);
  const financeiro = useFinanceiroAdmin(grupoId);

  const [senha, setSenha] = useState<SenhaParaMostrar | null>(null);
  const [removendo, setRemovendo] = useState<{ contaId: string; nome: string } | null>(null);
  const [erroDeAcao, setErroDeAcao] = useState<string | null>(null);
  const [vinculado, setVinculado] = useState(false);
  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [versaoLimpa, setVersaoLimpa] = useState(0);

  if (admins.isError) {
    return (
      <>
        <h1 className="sr">Admins</h1>
        <ErroRede aoTentar={() => void admins.refetch()} />
      </>
    );
  }
  if (!admins.data) {
    return (
      <>
        <TituloPagina>Admins</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={3} />
      </>
    );
  }

  const { admins: lista, podeGerirFinanceiro } = admins.data;
  const mensagemDe = (erro: unknown) =>
    erro instanceof ErroApi && erro.status < 500
      ? erro.message
      : 'Não foi possível concluir. Verifique a conexão e tente de novo.';

  const aoRedefinir = (contaId: string) => {
    setErroDeAcao(null);
    redefinir.mutate(contaId, {
      onSuccess: (r) => setSenha({ nome: r.nome, senha: r.senhaTemporaria }),
      onError: (erro) => setErroDeAcao(mensagemDe(erro)),
    });
  };

  const aoFecharSenha = () => {
    setSenha(null);
    redefinir.reset();
    adicionar.reset();
  };

  const aoRemover = () => {
    if (!removendo) return;
    remover.mutate(removendo.contaId, {
      onSuccess: () => setRemovendo(null),
      onError: (erro) => {
        setRemovendo(null);
        setErroDeAcao(mensagemDe(erro));
      },
    });
  };

  const aoAdicionar = (corpo: { nome: string; email: string }) => {
    setErroDeAcao(null);
    setVinculado(false);
    setSemConexao(false);
    setErrosDoServidor({});
    adicionar.mutate(corpo, {
      onSuccess: (resultado) => {
        setVersaoLimpa((v) => v + 1);
        if (resultado.contaNova) setSenha({ nome: resultado.nome, senha: resultado.senhaTemporaria });
        else setVinculado(true);
      },
      onError: (erro) => {
        const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
        if (doCampo) setErrosDoServidor(doCampo);
        else setSemConexao(true);
      },
    });
  };

  const pendente = financeiro.isPending ? financeiro.variables : undefined;
  return (
    <div className={estilos.estreito}>
      <title>Admins</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Admins</TituloPagina>
      {erroDeAcao ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">{erroDeAcao}</Faixa>
        </div>
      ) : null}
      {vinculado ? (
        <div className={estilos.faixa}>
          <Faixa tipo="info">Admin existente vinculado ao grupo.</Faixa>
        </div>
      ) : null}
      <Lista>
        {lista.map((admin) => (
          <ItemAdmin
            key={admin.contaId}
            admin={admin}
            podeGerirFinanceiro={podeGerirFinanceiro}
            acessaFinanceiro={pendente?.contaId === admin.contaId ? pendente.acessaFinanceiro : admin.acessaFinanceiro}
            aoMudarFinanceiro={(marcado) => {
              setErroDeAcao(null);
              financeiro.mutate(
                { contaId: admin.contaId, acessaFinanceiro: marcado },
                { onError: (erro) => setErroDeAcao(mensagemDe(erro)) },
              );
            }}
            aoRedefinirSenha={() => aoRedefinir(admin.contaId)}
            aoRemover={() => setRemovendo({ contaId: admin.contaId, nome: admin.nome })}
          />
        ))}
      </Lista>
      {lista.length === 1 ? (
        <p className={estilos.ajuda}>Você é o único admin deste grupo. Todo grupo precisa de pelo menos um admin.</p>
      ) : null}
      <section className={estilos.secao} aria-labelledby="adicionar-admin">
        <h2 id="adicionar-admin" className={estilos.subtitulo}>
          Adicionar admin
        </h2>
        <FormularioAdicionarAdmin
          errosDoServidor={errosDoServidor}
          enviando={adicionar.isPending}
          semConexao={semConexao}
          versaoLimpa={versaoLimpa}
          aoAdicionar={aoAdicionar}
        />
      </section>
      {senha ? <DialogoSenha nome={senha.nome} senha={senha.senha} aoFechar={aoFecharSenha} /> : null}
      {removendo ? (
        <DialogoConfirmacao
          {...textosConfirmacao.removerAdmin(removendo.nome)}
          carregando={remover.isPending}
          aoConfirmar={aoRemover}
          aoCancelar={() => setRemovendo(null)}
        />
      ) : null}
    </div>
  );
}
