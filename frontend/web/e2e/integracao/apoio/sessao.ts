import type { Page } from '@playwright/test';

/** Entra pela tela T04 (a sessão fica no cookie do contexto da página). */
export async function entrarComo(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  // Espera a resposta do login: sem ela, um `goto` ou `request` logo depois sai antes de o cookie existir.
  const resposta = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/sessao/entrar',
  );
  await page.getByRole('button', { name: 'Entrar' }).click();
  await resposta;
}

/**
 * Numa tela do admin de um grupo, aceita o aviso de privacidade do 1º acesso, se ele aparecer ("Entendi"
 * e o POST responder 204). Sem diálogo (já visto, ou recurso desligado), segue sem fazer nada.
 */
export async function aceitarAvisoDePrivacidade(page: Page): Promise<void> {
  const dialogo = page.getByRole('dialog', { name: 'Privacidade' });
  const apareceu = await dialogo.waitFor({ state: 'visible', timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  if (!apareceu) return;
  const resposta = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/sessao/aviso-privacidade',
  );
  await dialogo.getByRole('button', { name: 'Entendi' }).click();
  if ((await resposta).status() !== 204) throw new Error('O aviso de privacidade não foi marcado como visto.');
  await dialogo.waitFor({ state: 'hidden' });
}
