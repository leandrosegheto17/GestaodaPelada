import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projecaoPdf, type ProjecaoPdf } from '@pelada/contrato';
import { jsPDF } from 'jspdf';
import { registrarFontes, type LerFonte } from './fontes-pdf';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const FONTES = join(import.meta.dirname, '../../public/fontes/pdf');

/** Lê as fontes do disco (os testes não têm servidor de arquivos). */
export const lerFonteDoDisco: LerFonte = async (arquivo) => {
  const bytes = readFileSync(join(FONTES, arquivo));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

export function projecaoDoMockup(nome: 'publico-pdf-2026-10.json' | 'publico-pdf-2026-07.json'): ProjecaoPdf {
  return projecaoPdf.parse(JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')));
}

/** Documento A4 retrato em pt, com as fontes registradas. */
export async function novoDocumento(): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  await registrarFontes(doc, lerFonteDoDisco);
  return doc;
}
