import { redirect } from 'react-router';
import { grupoLembrado } from '../../pwa/armazenamento';

/**
 * Loader da rota `/`: com grupo lembrado vai direto ao ranking; sem ele (ou se o armazenamento
 * falhar) mostra a tela "Abra o link do seu grupo". Decisão local, sem chamar a API.
 */
export async function carregarEntrada(): Promise<Response | null> {
  try {
    const slug = await grupoLembrado();
    return slug ? redirect(`/g/${slug}`) : null;
  } catch {
    return null;
  }
}
