import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import type { EstadoExportacao } from './usarExportarPdf';
import estilos from './ranking.module.css';

export const MENSAGEM_ERRO_PDF = 'Não foi possível gerar o PDF.';
export const MENSAGEM_PDF_BAIXADO = 'PDF baixado.';

/** Faixa de resultado da exportação: erro com "Tentar de novo" ou o aviso de PDF baixado. */
export function FaixaPdf({ estado, aoTentar }: { estado: EstadoExportacao; aoTentar: () => void }) {
  if (estado === 'erro') {
    return (
      <div className={estilos.faixaPdf}>
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={aoTentar}>
              Tentar de novo
            </Botao>
          }
        >
          {MENSAGEM_ERRO_PDF}
        </Faixa>
      </div>
    );
  }
  if (estado === 'baixado') {
    return (
      <div className={estilos.faixaPdf}>
        <Faixa tipo="sucesso">{MENSAGEM_PDF_BAIXADO}</Faixa>
      </div>
    );
  }
  return null;
}
