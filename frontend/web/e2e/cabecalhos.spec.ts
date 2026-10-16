import { expect, test } from '@playwright/test';

const CAMINHOS = ['/', '/g/pelada-de-quinta', '/fontes/fontes.css'];

function diretivas(csp: string): Map<string, string> {
  return new Map(
    csp
      .split(';')
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const [nome = '', ...valores] = parte.split(/\s+/);
        return [nome, valores.join(' ')] as const;
      }),
  );
}

async function caminhoDoScript(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const html = await (await request.get('/')).text();
  const achado = /<script[^>]*\bsrc="([^"]+)"/.exec(html);
  if (!achado?.[1]) throw new Error('index.html sem script de módulo.');
  return achado[1];
}

test.describe('cabeçalhos de segurança dos assets', () => {
  test('todos os caminhos trazem CSP e cabeçalhos mínimos', async ({ request }) => {
    const caminhos = [...CAMINHOS, await caminhoDoScript(request)];
    for (const caminho of caminhos) {
      const resposta = await request.get(caminho);
      expect(resposta.status(), caminho).toBe(200);
      const csp = resposta.headers()['content-security-policy'];
      expect(csp, caminho).toBeTruthy();
      const d = diretivas(csp ?? '');
      expect(d.get('default-src')).toBe("'self'");
      expect(d.get('connect-src')).toBe("'self'");
      expect(d.get('font-src')).toBe("'self'");
      expect(d.get('img-src')).toBe("'self' data:");
      expect(d.get('frame-ancestors')).toBe("'none'");
      for (const [nome, valor] of d) {
        expect(valor, `${caminho} ${nome}`).not.toMatch(/unsafe-|\*|http:/);
      }
      const h = resposta.headers();
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['referrer-policy']).toBe('same-origin');
      expect(h['permissions-policy']).toContain('camera=()');
      expect(h['permissions-policy']).not.toMatch(/web-share|clipboard-write/);
    }
  });

  test('a página abre sem violação de CSP', async ({ page }) => {
    const problemas: string[] = [];
    page.on('console', (m) => {
      if (/content security policy|refused to/i.test(m.text())) problemas.push(m.text());
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.error(`Refused to load: ${e.violatedDirective}`);
      });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(problemas).toEqual([]);
  });

  test('/_headers não é servido como conteúdo', async ({ request }) => {
    const resposta = await request.get('/_headers');
    expect(await resposta.text()).not.toContain('Content-Security-Policy:');
  });
});
