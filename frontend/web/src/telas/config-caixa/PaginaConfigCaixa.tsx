import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { useFinanceiroMes, useSalvarConfig } from '../../dados/financeiro';
import { SemAcessoFinanceiro } from '../financeiro/SemAcessoFinanceiro';
import { FormularioConfigCaixa } from './FormularioConfigCaixa';
import estilos from './config-caixa.module.css';

/** T24: saldo inicial, data dele e mensalidade do caixa. A config atual vem da mesma consulta do mês. */
export function Component() {
  const { grupoId = '' } = useParams();
  const navegar = useNavigate();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const mes = useFinanceiroMes(grupoId);
  const salvar = useSalvarConfig(grupoId);
  const [errosDoServidor, setErrosDoServidor] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);

  if (mes.error instanceof ErroApi && mes.error.status === 403) return <SemAcessoFinanceiro base={base} />;
  if (mes.isError) {
    return (
      <>
        <h1 className="sr">Configurar caixa</h1>
        <ErroRede aoTentar={() => void mes.refetch()} />
      </>
    );
  }
  if (!mes.data) {
    return (
      <>
        <TituloPagina>Configurar caixa</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="linha" quantidade={3} />
      </>
    );
  }

  const { config, hoje } = mes.data;
  return (
    <div className={estilos.estreito}>
      <title>Configurar caixa</title>
      <Voltar para={`${base}/financeiro`} rotulo="Financeiro" />
      <TituloPagina>Configurar caixa</TituloPagina>
      <FormularioConfigCaixa
        atual={config}
        hoje={hoje}
        errosDoServidor={errosDoServidor}
        enviando={salvar.isPending}
        semConexao={semConexao}
        aoSalvar={(corpo) => {
          setSemConexao(false);
          setErrosDoServidor({});
          salvar.mutate(corpo, {
            onSuccess: () => void navegar(`${base}/financeiro`),
            onError: (erro) => {
              const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
              if (doCampo) setErrosDoServidor(doCampo);
              else setSemConexao(true);
            },
          });
        }}
      />
    </div>
  );
}
