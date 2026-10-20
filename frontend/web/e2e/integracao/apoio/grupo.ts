import type { Browser, Page } from '@playwright/test';
import { EMAIL_DONO, SENHA_DE_TESTE } from '../../../../../backend/scripts/seed-local/ids';
import { aceitarAvisoDePrivacidade, entrarComo } from './sessao';

export interface GrupoDeTeste {
  grupoId: string;
  slug: string;
  nome: string;
  emailAdmin: string;
  senhaAdmin: string;
}

/**
 * Cria um grupo novo pela tela do dono e deixa o primeiro admin com senha própria (a temporária só vale
 * uma vez). Devolve o contexto já autenticado como esse admin. O sufixo mantém os dados da execução à parte.
 * O aviso de privacidade do 1º acesso é aceito, a menos que o teste queira vê-lo (`aceitarAviso: false`).
 */
export async function criarGrupoComAdmin(
  browser: Browser,
  sufixo: string,
  opcoes: { aceitarAviso?: boolean } = {},
): Promise<{ grupo: GrupoDeTeste; admin: Page }> {
  const nome = `Racha E2E ${sufixo}`;
  const emailAdmin = `e2e-${sufixo}@exemplo.com.br`;
  const senhaAdmin = `Senha-nova-${sufixo}`;

  const dono = await (await browser.newContext()).newPage();
  await entrarComo(dono, EMAIL_DONO, SENHA_DE_TESTE);
  await dono.getByRole('link', { name: 'Novo grupo' }).first().click();
  await dono.getByLabel('Nome do grupo').fill(nome);
  await dono.getByLabel('Dia da semana').selectOption('quinta');
  await dono.getByLabel('Horário').fill('20:00');
  await dono.getByLabel('Nome', { exact: true }).fill('Admin E2E');
  await dono.getByLabel('E-mail', { exact: true }).fill(emailAdmin);
  const resposta = dono.waitForResponse((r) => r.url().endsWith('/api/dono/grupos') && r.request().method() === 'POST');
  await dono.getByRole('button', { name: 'Criar grupo' }).click();
  const criado = (await (await resposta).json()) as {
    grupo: { id: string; slug: string };
    primeiroAdmin: { senhaTemporaria: string };
  };

  const admin = await (await browser.newContext()).newPage();
  await entrarComo(admin, emailAdmin, criado.primeiroAdmin.senhaTemporaria);
  await admin.getByLabel('Nova senha', { exact: true }).fill(senhaAdmin);
  await admin.getByLabel('Confirmar nova senha').fill(senhaAdmin);
  await admin.getByRole('button', { name: 'Salvar e continuar' }).click();
  await admin.waitForURL(new RegExp(`/admin(/${criado.grupo.id})?$`));
  if (opcoes.aceitarAviso ?? true) {
    if (!admin.url().endsWith(`/admin/${criado.grupo.id}`)) await admin.goto(`/admin/${criado.grupo.id}`);
    await aceitarAvisoDePrivacidade(admin);
  }
  return { grupo: { grupoId: criado.grupo.id, slug: criado.grupo.slug, nome, emailAdmin, senhaAdmin }, admin };
}

/** Cadastra jogadores pela API (o cadastro pela tela já é coberto no I1), sempre com `X-Pelada: 1`. */
export async function cadastrarJogadores(page: Page, grupoId: string, apelidos: readonly string[]): Promise<void> {
  for (const apelido of apelidos) {
    const r = await page.request.post(`/api/grupos/${grupoId}/jogadores`, {
      headers: { 'X-Pelada': '1' },
      data: { apelido, anoNascimento: 1990, posicao: 'meia', telefone: null },
    });
    if (!r.ok()) throw new Error(`Falha ao cadastrar ${apelido}: ${r.status()}`);
  }
}
