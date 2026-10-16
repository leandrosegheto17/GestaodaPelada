import { useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Selo } from '../../componentes/basicos/Selo';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoSenha } from '../../componentes/dialogos-padrao';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useGrupoDono, useArquivarGrupo, useReativarGrupo, useSalvarSituacao } from '../../dados/dono/grupo';
import { useRedefinirSenhaConta } from '../../dados/dono/senha';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { useSessao } from '../../dados/sessao';
import { AdminsGrupoDono } from './AdminsGrupoDono';
import { ArquivamentoGrupo } from './ArquivamentoGrupo';
import { MetadadosGrupoDono } from './MetadadosGrupoDono';
import { caminhoAreaDono, lerAvisoGrupoDono } from './navegacao';
import { SituacaoComercial } from './SituacaoComercial';
import estilos from './dono.module.css';

type Aviso = 'vinculo' | 'situacao-salva' | 'arquivado' | 'reativado' | null;

const TEXTO_AVISO: Record<Exclude<Aviso, null>, { tipo: 'info' | 'sucesso'; texto: string }> = {
  vinculo: { tipo: 'info', texto: 'Admin existente vinculado; senha mantida.' },
  'situacao-salva': { tipo: 'sucesso', texto: 'Situação salva.' },
  arquivado: { tipo: 'sucesso', texto: 'Grupo arquivado.' },
  reativado: { tipo: 'sucesso', texto: 'Grupo reativado.' },
};

/** T28: visão do dono sobre um grupo. Só metadados: nenhum atalho para dados internos (RF-07). */
export function Component() {
  const { grupoId = '' } = useParams();
  const { state } = useLocation();
  const grupo = useGrupoDono(grupoId);
  const sessao = useSessao();
  const salvarSituacao = useSalvarSituacao(grupoId);
  const arquivar = useArquivarGrupo(grupoId);
  const reativar = useReativarGrupo(grupoId);
  const redefinir = useRedefinirSenhaConta();

  const [aviso, setAviso] = useState<Aviso>(lerAvisoGrupoDono(state));
  const [errosSituacao, setErrosSituacao] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [erroAoArquivar, setErroAoArquivar] = useState<string | undefined>(undefined);
  const [falhaGeral, setFalhaGeral] = useState(false);
  const [senha, setSenha] = useState<{ nome: string; senha: string } | null>(null);

  if (grupo.error instanceof ErroApi && grupo.error.status === 404) {
    return <Navigate to={caminhoAreaDono} replace />;
  }
  if (grupo.isError) {
    return (
      <>
        <h1 className="sr">Grupo</h1>
        <ErroRede aoTentar={() => void grupo.refetch()} />
      </>
    );
  }
  if (!grupo.data) {
    return (
      <div aria-busy="true">
        <TituloPagina>Grupo</TituloPagina>
        <Esqueleto variante="bloco" quantidade={4} />
      </div>
    );
  }

  const dados = grupo.data;
  const mostrar = aviso ? TEXTO_AVISO[aviso] : null;

  return (
    <div className={estilos.estreito}>
      <title>{`Grupo (visão do dono): ${dados.nome}`}</title>
      <Voltar para={caminhoAreaDono} rotulo="Área do dono" />
      <TituloPagina>
        {dados.nome}
        {dados.arquivadoEm ? (
          <>
            {' '}
            <Selo>arquivado</Selo>
          </>
        ) : null}
      </TituloPagina>
      {mostrar ? (
        <div className={estilos.faixa}>
          <Faixa tipo={mostrar.tipo}>{mostrar.texto}</Faixa>
        </div>
      ) : null}
      {falhaGeral ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">Não foi possível concluir. Verifique a conexão e tente de novo.</Faixa>
        </div>
      ) : null}
      <MetadadosGrupoDono grupo={dados} />
      {dados.arquivadoEm ? null : (
        <>
          <SituacaoComercial
            key={`${dados.situacaoComercial}-${dados.inicioTrial ?? ''}`}
            grupo={dados}
            errosDoServidor={errosSituacao}
            enviando={salvarSituacao.isPending}
            semConexao={semConexao}
            aoSalvar={(corpo) => {
              setAviso(null);
              setErrosSituacao({});
              setSemConexao(false);
              salvarSituacao.mutate(corpo, {
                onSuccess: () => setAviso('situacao-salva'),
                onError: (erro) => {
                  const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
                  if (doCampo) setErrosSituacao(doCampo);
                  else setSemConexao(true);
                },
              });
            }}
          />
          <AdminsGrupoDono
            admins={dados.admins}
            contaDoDono={sessao.data?.conta.id}
            aoRedefinir={(contaId) => {
              setFalhaGeral(false);
              redefinir.mutate(contaId, {
                onSuccess: (r) => setSenha({ nome: r.nome, senha: r.senhaTemporaria }),
                onError: () => setFalhaGeral(true),
              });
            }}
          />
        </>
      )}
      <ArquivamentoGrupo
        grupo={dados}
        arquivando={arquivar.isPending}
        erroAoArquivar={erroAoArquivar}
        reativando={reativar.isPending}
        aoCancelar={() => setErroAoArquivar(undefined)}
        aoArquivar={(nome) => {
          setErroAoArquivar(undefined);
          arquivar.mutate(nome, {
            onSuccess: () => {
              setAviso('arquivado');
            },
            onError: (erro) => {
              const campos = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
              setErroAoArquivar(campos?.nomeConfirmacao ?? 'Não foi possível arquivar. Tente de novo.');
            },
          });
        }}
        aoReativar={() => {
          setFalhaGeral(false);
          reativar.mutate(undefined, {
            onSuccess: () => setAviso('reativado'),
            onError: () => setFalhaGeral(true),
          });
        }}
      />
      {senha ? (
        <DialogoSenha
          nome={senha.nome}
          senha={senha.senha}
          aoFechar={() => {
            setSenha(null);
            redefinir.reset();
          }}
        />
      ) : null}
    </div>
  );
}
