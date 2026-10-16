import type { Page } from '@playwright/test';

/** Entra pela tela T04 (a sessão fica no cookie do contexto da página). */
export async function entrarComo(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
