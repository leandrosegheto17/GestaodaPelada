import { useCallback, useEffect, useRef, useState } from 'react';
import { registrarPdfExportado } from '../../dados/eventos';
import { useProjecaoPdf } from '../../dados/publico';
import { mesPorExtenso } from '../../formatacao';
import { baixarArquivo, compartilharArquivo, entregarPdf, type ResultadoEntrega } from '../../pdf/entregar';

/**
 * - `preparando`: buscando os dados ou gerando o PDF.
 * - `d4`: o navegador recusou o compartilhamento direto; a pessoa escolhe Compartilhar ou Baixar.
 * - `baixado`: o PDF foi baixado (faixa por alguns segundos).
 * - `erro`: não foi possível gerar o PDF.
 */
export type EstadoExportacao = 'ocioso' | 'preparando' | 'd4' | 'baixado' | 'erro';

const MS_FAIXA_BAIXADO = 4000;

interface Opcoes {
  slug: string;
  mes: string;
  nomeGrupo: string;
  /** Recurso ligado e há jogadores: só então busca a projeção e traz o gerador para a memória. */
  habilitado: boolean;
}

/**
 * Exportar PDF (RF-49, RF-52): busca a projeção ao abrir o mês, gera o arquivo no navegador e o entrega
 * compartilhando ou baixando. O evento `pdf_exportado` sai uma vez por arquivo entregue.
 */
export function usarExportarPdf({ slug, mes, nomeGrupo, habilitado }: Opcoes) {
  const projecao = useProjecaoPdf(slug, mes, habilitado);
  const [estado, setEstado] = useState<EstadoExportacao>('ocioso');
  const arquivo = useRef<File | null>(null);
  const titulo = `Ranking de ${mesPorExtenso(mes)} da ${nomeGrupo}`;

  useEffect(() => {
    if (!habilitado) return;
    void import('../../pdf/gerar-pdf').then((m) => m.precarregarPdf()).catch(() => undefined);
  }, [habilitado]);

  useEffect(() => {
    if (estado !== 'baixado') return;
    const timer = setTimeout(() => setEstado('ocioso'), MS_FAIXA_BAIXADO);
    return () => clearTimeout(timer);
  }, [estado]);

  const concluir = useCallback(
    (resultado: ResultadoEntrega) => {
      if (resultado === 'cancelado') setEstado('ocioso');
      else if (resultado === 'pedir-gesto') setEstado('d4');
      else {
        registrarPdfExportado(slug, mes);
        setEstado(resultado === 'baixado' ? 'baixado' : 'ocioso');
      }
    },
    [slug, mes],
  );

  const exportar = useCallback(async () => {
    setEstado('preparando');
    try {
      const dados = projecao.data ?? (await projecao.refetch({ throwOnError: true })).data;
      if (!dados) throw new Error('Projeção do PDF indisponível.');
      const { gerarPdf } = await import('../../pdf/gerar-pdf');
      const blob = await gerarPdf(dados);
      arquivo.current = new File([blob], `ranking-${slug}-${mes}.pdf`, { type: 'application/pdf' });
      concluir(await entregarPdf(arquivo.current, titulo));
    } catch {
      setEstado('erro');
    }
  }, [projecao, slug, mes, titulo, concluir]);

  const compartilharDoD4 = useCallback(async () => {
    if (!arquivo.current) return;
    try {
      const resultado = await compartilharArquivo(arquivo.current, titulo);
      if (resultado !== 'pedir-gesto') concluir(resultado);
    } catch {
      setEstado('erro');
    }
  }, [titulo, concluir]);

  const baixarDoD4 = useCallback(() => {
    if (!arquivo.current) return;
    baixarArquivo(arquivo.current);
    concluir('baixado');
  }, [concluir]);

  return {
    estado,
    titulo,
    exportar,
    compartilharDoD4,
    baixarDoD4,
    fecharD4: () => setEstado('ocioso'),
    tentarDeNovo: () => void exportar(),
  };
}
