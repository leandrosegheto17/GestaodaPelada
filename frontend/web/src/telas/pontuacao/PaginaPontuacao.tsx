import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { usePesos, useSalvarPesos, type CorpoPesos } from '../../dados/pesos';
import { CartaoVigente } from './CartaoVigente';
import { FormularioPesos } from './FormularioPesos';
import { HistoricoPesos } from './HistoricoPesos';
import estilos from './pontuacao.module.css';

const DURACAO_AVISO_MS = 4000;

/** T18: pesos vigentes, nova configuração (vale a partir de hoje) e histórico. */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const painel = usePesos(grupoId);
  const salvar = useSalvarPesos(grupoId);
  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!salvo) return;
    const timer = setTimeout(() => setSalvo(false), DURACAO_AVISO_MS);
    return () => clearTimeout(timer);
  }, [salvo]);

  if (painel.isError) {
    return (
      <>
        <h1 className="sr">Pontuação</h1>
        <ErroRede aoTentar={() => void painel.refetch()} />
      </>
    );
  }
  if (!painel.data) {
    return (
      <>
        <TituloPagina>Pontuação</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="linha" quantidade={6} />
      </>
    );
  }

  const aoSalvar = (corpo: CorpoPesos) => {
    setSalvo(false);
    setSemConexao(false);
    setErrosDoServidor({});
    salvar.mutate(corpo, {
      onSuccess: () => setSalvo(true),
      onError: (erro) => {
        const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
        if (doCampo) setErrosDoServidor(doCampo);
        else setSemConexao(true);
      },
    });
  };

  const { vigente, historico } = painel.data;
  return (
    <div className={estilos.estreito}>
      <title>Pontuação</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Pontuação</TituloPagina>
      {salvo ? (
        <div className={estilos.faixa}>
          <Faixa tipo="sucesso">Nova configuração vale a partir de hoje.</Faixa>
        </div>
      ) : null}
      <CartaoVigente vigente={vigente} />
      <section className={estilos.secao} aria-labelledby="nova-configuracao">
        <h2 id="nova-configuracao" className={estilos.subtitulo}>
          Nova configuração (vale a partir de hoje)
        </h2>
        <FormularioPesos
          key={vigente.vigenteDesde}
          vigente={vigente}
          errosDoServidor={errosDoServidor}
          enviando={salvar.isPending}
          semConexao={semConexao}
          aoSalvar={aoSalvar}
        />
      </section>
      <HistoricoPesos historico={historico} />
    </div>
  );
}
