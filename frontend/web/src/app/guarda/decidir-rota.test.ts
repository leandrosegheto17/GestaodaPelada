import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sessaoEu, type SessaoEu } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { decidirRota, destinoAposEntrar } from './decidir-rota';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const sessao = (arquivo: string): SessaoEu =>
  sessaoEu.parse(JSON.parse(readFileSync(join(RESPOSTAS, arquivo), 'utf8')));

const admin = sessao('sessao-eu-admin.json');
const carlos = sessao('sessao-eu-carlos.json');
const trocaDeSenha = sessao('sessao-eu-troca-de-senha.json');

const em = (pathname: string, search = '') => ({ pathname, search });

describe('decidirRota', () => {
  it('sem sessão em área protegida vai para a entrada com o destino', () => {
    expect(decidirRota(null, em('/admin/g-quinta/partidas', '?mes=2026-10'))).toBe(
      '/entrar?destino=%2Fadmin%2Fg-quinta%2Fpartidas%3Fmes%3D2026-10',
    );
    expect(decidirRota(null, em('/dono'))).toBe('/entrar?destino=%2Fdono');
    expect(decidirRota(null, em('/entrar/nova-senha'))).toBe('/entrar');
  });

  it.each(['/admin', '/dono', '/conta/senha'])('troca de senha em %s vai para a nova senha', (rota) => {
    expect(decidirRota(trocaDeSenha, em(rota))).toBe('/entrar/nova-senha');
  });

  it('troca de senha na própria tela de nova senha não redireciona', () => {
    expect(decidirRota(trocaDeSenha, em('/entrar/nova-senha'))).toBeNull();
  });

  it('admin: grupo do vínculo abre, grupo alheio volta para /admin', () => {
    expect(decidirRota(admin, em('/admin/g-quinta'))).toBeNull();
    expect(decidirRota(admin, em('/admin/g-outro'))).toBe('/admin');
    expect(decidirRota(admin, em('/admin'))).toBeNull();
  });

  it('quem não é o dono não abre /dono', () => {
    expect(carlos.conta.eDono).toBe(false);
    expect(decidirRota(carlos, em('/dono'))).toBe('/admin');
    expect(decidirRota(admin, em('/dono'))).toBeNull();
  });

  it.each(['/', '/g/pelada-de-quinta', '/entrar', '/administracao'])('%s é pública para qualquer sessão', (rota) => {
    for (const s of [null, admin, carlos, trocaDeSenha]) expect(decidirRota(s, em(rota))).toBeNull();
  });
});

describe('destinoAposEntrar', () => {
  it('troca de senha obrigatória vai para a nova senha, mesmo com destino', () => {
    expect(destinoAposEntrar(trocaDeSenha, '/admin/g-quinta')).toBe('/entrar/nova-senha');
  });

  it('dono sem destino vai para /dono; admin sem destino para /admin', () => {
    expect(destinoAposEntrar(admin, null)).toBe('/dono');
    expect(destinoAposEntrar(carlos, null)).toBe('/admin');
  });

  it('destino válido é mantido; inválido é ignorado', () => {
    expect(destinoAposEntrar(admin, '/admin/g-quinta')).toBe('/admin/g-quinta');
    expect(destinoAposEntrar(carlos, '//evil.com')).toBe('/admin');
  });
});
