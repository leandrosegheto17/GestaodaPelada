import { describe, expect, it } from 'vitest';
import {
  ALFABETO_SENHA_TEMPORARIA,
  gerarSenhaTemporaria,
  gerarTokenSessao,
  hashToken,
} from '../../src/infraestrutura/seguranca/index.js';

describe('token de sessão', () => {
  it('tem 43 caracteres base64url e 1000 tokens são distintos', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => gerarTokenSessao()));
    expect(tokens.size).toBe(1000);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it('hashToken devolve o SHA-256 conhecido (32 bytes)', async () => {
    const hash = await hashToken('abc');
    expect(hash).toHaveLength(32);
    const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('senha temporária', () => {
  it('tem 12 caracteres, só do alfabeto, sem ambíguos', () => {
    for (let i = 0; i < 200; i++) {
      const senha = gerarSenhaTemporaria();
      expect(senha).toHaveLength(12);
      for (const c of senha) expect(ALFABETO_SENHA_TEMPORARIA).toContain(c);
      expect(senha).not.toMatch(/[0OolI1]/);
    }
  });
  it('descarta bytes acima do limite em vez de reduzir por módulo', () => {
    const n = ALFABETO_SENHA_TEMPORARIA.length;
    const limite = Math.floor(256 / n) * n;
    let chamadas = 0;
    const fonte = (bytes: Uint8Array) => {
      chamadas++;
      // 1ª rodada: só bytes enviesados (descartados); depois, zeros (primeiro caractere do alfabeto)
      bytes.fill(chamadas === 1 ? limite : 0);
      return bytes;
    };
    const senha = gerarSenhaTemporaria(fonte);
    expect(chamadas).toBeGreaterThan(1);
    expect(senha).toBe(ALFABETO_SENHA_TEMPORARIA[0]?.repeat(12));
  });
});
