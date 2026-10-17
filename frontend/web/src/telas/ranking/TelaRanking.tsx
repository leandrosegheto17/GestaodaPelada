import type { RankingPublico } from '@pelada/contrato';
import { useState, type MouseEvent } from 'react';
import { AvisoEnderecoNovo } from '../../componentes/aviso-endereco-novo';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BarraSuperior } from '../../componentes/barras/BarraSuperior';
import { PularConteudo } from '../../componentes/barras/PularConteudo';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Icone } from '../../componentes/basicos/Icone';
import { recursos } from '../../config/recursos';
import { descreverAgenda } from '../../formatacao/agenda';
import { AvisoInstalacao } from './AvisoInstalacao';
import { ConteudoRanking } from './ConteudoRanking';
import { DialogoPdfPronto } from './DialogoPdfPronto';
import { FaixaPdf } from './FaixaPdf';
import { FaixaSemConexao } from './FaixaSemConexao';
import { usarExportarPdf } from './usarExportarPdf';
import estilos from './ranking.module.css';

interface Props {
  ranking: RankingPublico;
  aoTrocarMes: (mes: string) => void;
  atualizando?: boolean;
  /** `geradoEm` do ranking exibido quando a rede não respondeu; `null` = atualizado. */
  semConexaoDesde?: string | null;
}

/** T01 com dados: barra do grupo, avisos, conteúdo e ação de exportar no celular. */
export function TelaRanking({ ranking, aoTrocarMes, atualizando = false, semConexaoDesde = null }: Props) {
  const { grupo } = ranking;
  const exportar = ranking.linhas.length > 0 && recursos.ligado('pdf');
  const [precisaDeConexao, setPrecisaDeConexao] = useState(false);
  const pdf = usarExportarPdf({ slug: grupo.slug, mes: ranking.mes, nomeGrupo: grupo.nome, habilitado: exportar });
  const preparando = pdf.estado === 'preparando';

  // Entrar exige rede: sem ela, o toque nos ícones de admin não navega e explica.
  const aoToqueNoAdmin = (evento: MouseEvent) => {
    if (semConexaoDesde !== null || !navigator.onLine) {
      evento.preventDefault();
      setPrecisaDeConexao(true);
    }
  };

  return (
    <>
      <title>{`Ranking: ${grupo.nome}`}</title>
      <PularConteudo texto="Pular para o ranking" />
      <BarraSuperior
        titulo={grupo.nome}
        subtitulo={descreverAgenda(grupo)}
        destinoAdmin={`/admin?grupo=${encodeURIComponent(grupo.slug)}`}
        destinoFinanceiro={`/admin?grupo=${encodeURIComponent(grupo.slug)}&area=financeiro`}
        aoNavegar={aoToqueNoAdmin}
      />
      <AvisoInstalacao />
      {semConexaoDesde !== null ? <FaixaSemConexao geradoEm={semConexaoDesde} /> : null}
      <AvisoEnderecoNovo enderecoNovo={ranking.enderecoNovo} />
      <main id="conteudo" tabIndex={-1} className={estilos.conteudo}>
        {precisaDeConexao ? <Faixa tipo="erro">É preciso conexão para entrar.</Faixa> : null}
        <FaixaPdf estado={pdf.estado} aoTentar={pdf.tentarDeNovo} />
        <ConteudoRanking
          ranking={ranking}
          aoTrocarMes={aoTrocarMes}
          atualizando={atualizando}
          exportar={{ preparando, aoExportar: () => void pdf.exportar() }}
        />
      </main>
      {exportar ? (
        <BarraAcao soCelular>
          <Botao bloco carregando={preparando} rotuloCarregando="Preparando PDF…" onClick={() => void pdf.exportar()}>
            <Icone nome="exportar" />
            Exportar PDF
          </Botao>
        </BarraAcao>
      ) : null}
      {pdf.estado === 'd4' ? (
        <DialogoPdfPronto
          descricao={pdf.titulo}
          aoCompartilhar={() => void pdf.compartilharDoD4()}
          aoBaixar={pdf.baixarDoD4}
          aoFechar={pdf.fecharD4}
        />
      ) : null}
    </>
  );
}
