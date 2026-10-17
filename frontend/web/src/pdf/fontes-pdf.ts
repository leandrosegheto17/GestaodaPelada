import type { jsPDF } from 'jspdf';

/** Fontes TrueType do PDF (o jsPDF só embute TTF), copiadas de `public/fontes/pdf/`. */
export const FONTES_PDF = {
  texto: { arquivo: 'Barlow-Regular.ttf', familia: 'Barlow', estilo: 'normal' },
  textoNegrito: { arquivo: 'Barlow-Bold.ttf', familia: 'Barlow', estilo: 'bold' },
  textoSemi: { arquivo: 'Barlow-SemiBold.ttf', familia: 'BarlowSemiBold', estilo: 'normal' },
  titulo: { arquivo: 'BarlowCondensed-Bold.ttf', familia: 'BarlowCondensed', estilo: 'bold' },
  tituloExtra: { arquivo: 'BarlowCondensed-ExtraBold.ttf', familia: 'BarlowCondensedExtra', estilo: 'normal' },
} as const;

export type FontePdf = keyof typeof FONTES_PDF;

/** Lê o arquivo de uma fonte (bytes). O padrão busca em `/fontes/pdf/`; os testes passam outro leitor. */
export type LerFonte = (arquivo: string) => Promise<ArrayBuffer>;

export const lerFontePorRede: LerFonte = async (arquivo) => {
  const resposta = await fetch(`/fontes/pdf/${arquivo}`);
  if (!resposta.ok) throw new Error(`Fonte do PDF indisponível: ${arquivo}.`);
  return resposta.arrayBuffer();
};

function paraBase64(bytes: ArrayBuffer): string {
  const dados = new Uint8Array(bytes);
  let binario = '';
  for (let i = 0; i < dados.length; i += 0x8000) binario += String.fromCharCode(...dados.subarray(i, i + 0x8000));
  return btoa(binario);
}

const emMemoria = new Map<string, string>();

async function base64Da(arquivo: string, ler: LerFonte): Promise<string> {
  let base64 = emMemoria.get(arquivo);
  if (base64 === undefined) {
    base64 = paraBase64(await ler(arquivo));
    emMemoria.set(arquivo, base64);
  }
  return base64;
}

/** Baixa as fontes de antemão (uma vez por sessão) para a geração do PDF não esperar a rede. */
export async function precarregarFontes(ler: LerFonte = lerFontePorRede): Promise<void> {
  await Promise.all(Object.values(FONTES_PDF).map((f) => base64Da(f.arquivo, ler)));
}

/** Registra as fontes no documento. Os bytes de cada arquivo são lidos uma vez por sessão. */
export async function registrarFontes(doc: jsPDF, ler: LerFonte = lerFontePorRede): Promise<void> {
  for (const fonte of Object.values(FONTES_PDF)) {
    doc.addFileToVFS(fonte.arquivo, await base64Da(fonte.arquivo, ler));
    doc.addFont(fonte.arquivo, fonte.familia, fonte.estilo);
  }
}

/** Escolhe a fonte do documento para o próximo texto. */
export function usarFonte(doc: jsPDF, fonte: FontePdf, tamanho: number): void {
  doc.setFont(FONTES_PDF[fonte].familia, FONTES_PDF[fonte].estilo);
  doc.setFontSize(tamanho);
}
