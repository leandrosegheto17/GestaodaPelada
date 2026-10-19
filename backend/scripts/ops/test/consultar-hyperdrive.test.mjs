import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('../consultar-hyperdrive.sh', import.meta.url));

let servidor;
let pedidos;
let pasta;

beforeEach(async () => {
  pedidos = [];
  pasta = mkdtempSync(join(tmpdir(), 'hyperdrive-'));
  servidor = createServer((req, res) => {
    pedidos.push({ url: req.url, auth: req.headers.authorization });
    res.end('{"success":true}');
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
});

afterEach(async () => {
  await new Promise((ok) => servidor.close(ok));
  rmSync(pasta, { recursive: true, force: true });
});

const rodar = (token) =>
  new Promise((ok) => {
    const filho = spawn('bash', [SCRIPT, 'cfg1'], {
      cwd: pasta,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: 'conta',
        CLOUDFLARE_API_BASE: `http://127.0.0.1:${servidor.address().port}`,
      },
    });
    let out = '';
    let err = '';
    filho.stdout.on('data', (d) => (out += d));
    filho.stderr.on('data', (d) => (err += d));
    filho.on('close', (rc) => ok({ rc, out, err }));
  });

describe('consultar-hyperdrive.sh', () => {
  it('token hostil não cria arquivo, não faz requisição e sai com rc 1 sem ecoar o valor', async () => {
    const hostil = `x"\noutput = "f"`;
    const r = await rodar(hostil);
    expect(r.rc).toBe(1);
    expect(pedidos).toHaveLength(0);
    expect(existsSync(join(pasta, 'f'))).toBe(false);
    expect(r.err + r.out).not.toContain('output');
  });

  it('token vazio falha fechado', async () => {
    expect((await rodar('')).rc).toBe(1);
    expect(pedidos).toHaveLength(0);
  });

  it('token válido faz uma requisição com o cabeçalho Bearer', async () => {
    const r = await rodar('abc_DEF-123');
    expect(r.rc).toBe(0);
    expect(pedidos).toEqual([{ url: '/accounts/conta/hyperdrive/configs/cfg1', auth: 'Bearer abc_DEF-123' }]);
    expect(r.out).toContain('"success":true');
  });
});
