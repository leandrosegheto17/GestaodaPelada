import { slug as esquemaSlug } from '@pelada/contrato';
import { redirect } from 'react-router';
import { esquecerGrupo, grupoLembrado } from '../../pwa/armazenamento';

/**
 * Loader da rota `/`: com grupo lembrado vai direto ao ranking; sem ele (ou se o armazenamento
 * falhar) mostra a tela "Abra o link do seu grupo". Decisão local, sem chamar a API.
 */
export async function carregarEntrada(): Promise<Response | null> {
  try {
    const slug = await grupoLembrado();
    if (slug === null) return null;
    // Destino só com slug validado: nada do armazenamento vai cru para o redirecionamento.
    if (esquemaSlug.safeParse(slug).success) return redirect(`/g/${slug}`);
    await esquecerGrupo();
    return null;
  } catch {
    return null;
  }
}
