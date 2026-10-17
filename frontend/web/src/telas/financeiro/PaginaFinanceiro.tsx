import { type MesFinanceiro, mes as esquemaMes } from '@pelada/contrato';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao } from '../../componentes/dialogos-padrao';
import { NavegadorMes } from '../../componentes/listas/NavegadorMes';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { ErroApi } from '../../dados/erros';
import { useFinanceiroMes } from '../../dados/financeiro';
import { mesPorExtenso } from '../../formatacao';
import { CartaoSaldos } from './CartaoSaldos';
import { SecaoLancamentos } from './SecaoLancamentos';
import { SecaoPagamentos } from './SecaoPagamentos';
import { SemAcessoFinanceiro } from './SemAcessoFinanceiro';
import { usarPagamentos } from './usarPagamentos';
import estilos from './financeiro.module.css';

/** T22: o caixa do mês. Só para quem tem a permissão do financeiro (a API decide: 403). */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const [parametros, definirParametros] = useSearchParams();
  const mesDaUrl = parametros.get('mes');
  const mesValido = mesDaUrl === null || esquemaMes.safeParse(mesDaUrl).success;
  const financeiro = useFinanceiroMes(grupoId, mesValido ? (mesDaUrl ?? undefined) : undefined);

  // Mês malformado na URL: tira o parâmetro e segue com o mês corrente.
  useEffect(() => {
    if (mesValido) return;
    definirParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        novos.delete('mes');
        return novos;
      },
      { replace: true },
    );
  }, [mesValido, definirParametros]);

  if (financeiro.error instanceof ErroApi && financeiro.error.status === 403) {
    return <SemAcessoFinanceiro base={base} />;
  }
  if (financeiro.isError) {
    return (
      <>
        <h1 className="sr">Financeiro</h1>
        <ErroRede aoTentar={() => void financeiro.refetch()} />
      </>
    );
  }
  if (!financeiro.data) {
    return (
      <>
        <TituloPagina>Financeiro</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={3} />
      </>
    );
  }

  const dados = financeiro.data;
  if (dados.config === null || dados.resumoMes === null || dados.saldoAtualCentavos === null) {
    return (
      <div className={estilos.estreito}>
        <title>Financeiro: caixa não configurado</title>
        <Voltar para={base} rotulo="Início" />
        <TituloPagina>Financeiro</TituloPagina>
        <EstadoVazio
          icone={null}
          titulo="Caixa não configurado"
          texto="Configure o saldo inicial para começar."
          acao={
            <BotaoLink to={`${base}/financeiro/config`} variante="principal">
              Configurar caixa
            </BotaoLink>
          }
        />
      </div>
    );
  }

  return (
    <CaixaDoMes
      grupoId={grupoId}
      base={base}
      dados={{
        ...dados,
        config: dados.config,
        resumoMes: dados.resumoMes,
        saldoAtualCentavos: dados.saldoAtualCentavos,
      }}
      aoTrocarMes={(mes) => definirParametros({ mes })}
    />
  );
}

type MesConfigurado = MesFinanceiro & {
  config: NonNullable<MesFinanceiro['config']>;
  resumoMes: NonNullable<MesFinanceiro['resumoMes']>;
  saldoAtualCentavos: number;
};

interface PropsCaixa {
  grupoId: string;
  base: string;
  dados: MesConfigurado;
  aoTrocarMes: (mes: string) => void;
}

function CaixaDoMes({ grupoId, base, dados, aoTrocarMes }: PropsCaixa) {
  const pagamentos = usarPagamentos(grupoId, dados);
  return (
    <div>
      <title>{`Financeiro: ${mesPorExtenso(dados.mes)}`}</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Financeiro</TituloPagina>
      {pagamentos.erro ? (
        <Faixa tipo="erro" aoFechar={pagamentos.fecharErro} rotuloFechar="Fechar aviso">
          {pagamentos.erro}
        </Faixa>
      ) : null}
      <div className={estilos.ferramentas}>
        <NavegadorMes
          mes={dados.mes}
          mesAnterior={dados.navegacao.mesAnterior}
          mesSeguinte={dados.navegacao.mesSeguinte}
          aoTrocar={aoTrocarMes}
        />
        <BotaoLink to={`${base}/financeiro/config`} variante="texto">
          Configurar caixa
        </BotaoLink>
      </div>
      <CartaoSaldos saldoAtualCentavos={dados.saldoAtualCentavos} resumo={dados.resumoMes} />
      <div className={estilos.ladoALado}>
        <SecaoPagamentos
          pagamentos={pagamentos.pagamentos}
          mensalidadeCentavos={dados.config.mensalidadeCentavos}
          aoMudar={pagamentos.pedirMudanca}
          ocupados={pagamentos.ocupados}
        />
        <SecaoLancamentos lancamentos={dados.lancamentos} mes={dados.mes} base={`${base}/financeiro/lancamentos`} />
      </div>
      <BarraAcao>
        <BotaoLink to={`${base}/financeiro/lancamentos/novo`} variante="principal">
          Novo lançamento
        </BotaoLink>
      </BarraAcao>
      {pagamentos.confirmacao ? (
        <DialogoConfirmacao
          titulo={pagamentos.confirmacao.texto.titulo}
          texto={pagamentos.confirmacao.texto.texto}
          verbo={pagamentos.confirmacao.texto.verbo}
          carregando={pagamentos.confirmacao.carregando}
          aoConfirmar={pagamentos.confirmacao.confirmar}
          aoCancelar={pagamentos.confirmacao.cancelar}
        />
      ) : null}
    </div>
  );
}
