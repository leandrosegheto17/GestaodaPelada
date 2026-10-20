/**
 * - `compartilhado`: o aparelho abriu a folha de compartilhamento e a pessoa concluiu.
 * - `cancelado`: a pessoa fechou a folha de compartilhamento.
 * - `pedir-gesto`: o navegador recusou por falta de gesto recente; é preciso um novo toque.
 * - `baixado`: o aparelho não compartilha arquivo; o PDF foi baixado.
 */
export type ResultadoEntrega = 'compartilhado' | 'cancelado' | 'pedir-gesto' | 'baixado';

/** O navegador sabe compartilhar este arquivo? */
export function podeCompartilharArquivo(arquivo: File): boolean {
  return typeof navigator.share === 'function' && navigator.canShare?.({ files: [arquivo] }) === true;
}

/** Abre a folha de compartilhamento do aparelho. Deve rodar no mesmo gesto do toque. */
export async function compartilharArquivo(
  arquivo: File,
  titulo: string,
): Promise<'compartilhado' | 'cancelado' | 'pedir-gesto'> {
  try {
    await navigator.share({ files: [arquivo], title: titulo });
    return 'compartilhado';
  } catch (erro) {
    const nome = erro instanceof DOMException ? erro.name : '';
    if (nome === 'AbortError') return 'cancelado';
    if (nome === 'NotAllowedError') return 'pedir-gesto';
    throw erro;
  }
}

/** Baixa o arquivo por um link temporário; a URL de objeto é revogada logo depois. */
export function baixarArquivo(arquivo: File): void {
  const url = URL.createObjectURL(arquivo);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = arquivo.name;
  ancora.rel = 'noopener';
  document.body.append(ancora);
  ancora.click();
  ancora.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Aparelho que compartilha: a pessoa escolhe Compartilhar ou Baixar (`pedir-gesto`); senão, baixa direto. */
export async function entregarPdf(arquivo: File): Promise<ResultadoEntrega> {
  if (podeCompartilharArquivo(arquivo)) return 'pedir-gesto';
  baixarArquivo(arquivo);
  return 'baixado';
}
