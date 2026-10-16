import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { useEditarGrupo, useGrupo, type CorpoGrupo } from '../../dados/grupo';
import { CartaoLink } from './CartaoLink';
import { FormularioGrupo } from './FormularioGrupo';
import estilos from './grupo.module.css';

const DURACAO_AVISO_MS = 4000;

/** T20: dados do grupo e o link público do ranking. */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const grupo = useGrupo(grupoId);
  const editar = useEditarGrupo(grupoId);
  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!salvo) return;
    const timer = setTimeout(() => setSalvo(false), DURACAO_AVISO_MS);
    return () => clearTimeout(timer);
  }, [salvo]);

  if (grupo.isError) {
    return (
      <>
        <h1 className="sr">Dados do grupo</h1>
        <ErroRede aoTentar={() => void grupo.refetch()} />
      </>
    );
  }
  if (!grupo.data) {
    return (
      <>
        <TituloPagina>Dados do grupo</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="linha" quantidade={3} />
        <Esqueleto variante="botao" />
      </>
    );
  }

  const aoSalvar = (corpo: CorpoGrupo) => {
    setSalvo(false);
    setSemConexao(false);
    setErrosDoServidor({});
    editar.mutate(corpo, {
      onSuccess: () => setSalvo(true),
      onError: (erro) => {
        const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
        if (doCampo) setErrosDoServidor(doCampo);
        else setSemConexao(true);
      },
    });
  };

  const { grupo: dados } = grupo.data;
  return (
    <div className={estilos.estreito}>
      <title>Dados do grupo</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Dados do grupo</TituloPagina>
      {salvo ? (
        <div className={estilos.faixa}>
          <Faixa tipo="sucesso">Dados salvos.</Faixa>
        </div>
      ) : null}
      <FormularioGrupo
        key={dados.id}
        grupo={dados}
        errosDoServidor={errosDoServidor}
        enviando={editar.isPending}
        semConexao={semConexao}
        aoSalvar={aoSalvar}
      />
      <CartaoLink nomeDoGrupo={dados.nome} url={dados.urlPublica} />
    </div>
  );
}
