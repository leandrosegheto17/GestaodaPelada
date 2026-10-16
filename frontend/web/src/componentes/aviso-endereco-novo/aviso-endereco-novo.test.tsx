import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { AvisoEnderecoNovo, linkEnderecoNovo } from './index';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const lerEndereco = (arquivo: string): string | null =>
  (JSON.parse(readFileSync(join(RESPOSTAS, arquivo), 'utf8')) as { enderecoNovo?: string | null }).enderecoNovo ?? null;

const NOVO = lerEndereco('publico-ranking-endereco-novo.json');

const emRota = (rota: string, enderecoNovo: string | null) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AvisoEnderecoNovo enderecoNovo={enderecoNovo} />
    </MemoryRouter>,
  );

describe('AvisoEnderecoNovo', () => {
  it('a fixture traz mesmo um endereço novo', () => {
    expect(NOVO).toBeTruthy();
  });

  it.each([null, ''])('endereço %j não renderiza nada', (valor) => {
    const { container } = emRota('/g/pelada-de-quinta', valor);
    expect(container).toBeEmptyDOMElement();
  });

  it('o ranking sem endereço novo não mostra aviso', () => {
    const { container } = emRota('/g/pelada-de-quinta', lerEndereco('publico-ranking-2026-10.json'));
    expect(container).toBeEmptyDOMElement();
  });

  it.each(['/g/pelada-de-quinta?mes=2026-09', '/admin/g-quinta'])('mantém a rota %s no host novo', (rota) => {
    emRota(rota, NOVO);
    expect(screen.getByRole('status')).toHaveTextContent('O app mudou de endereço.');
    const link = screen.getByRole('link', { name: 'Abrir o novo endereço e reinstalar' });
    expect(link).toHaveAttribute('href', new URL(rota, NOVO!).href);
  });

  it('não é fechável', () => {
    emRota('/g/x', NOVO);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sem violações do axe', async () => {
    const { container } = emRota('/g/x', NOVO);
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('linkEnderecoNovo (matriz adversarial)', () => {
  const host = 'novo.exemplo.invalid';
  const base = 'https:' + '//' + host;

  it('monta o link com a rota atual', () => {
    expect(linkEnderecoNovo(base, '/g/x?mes=2026-09#topo')).toBe(`${base}/g/x?mes=2026-09#topo`);
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<b>oi</b>'],
    ['http:' + '//' + host],
    [host],
    ['//' + host],
    [''],
    [null],
    [undefined],
    ['https:' + '//usuario:senha@' + host],
  ])('endereço inválido %j → null', (endereco) => {
    expect(linkEnderecoNovo(endereco, '/g/x')).toBeNull();
  });

  it('o caminho próprio do endereço é substituído pela rota', () => {
    expect(linkEnderecoNovo(base + '/outro/caminho?a=1', '/g/x')).toBe(`${base}/g/x`);
  });

  it.each([
    '//outro-host/x',
    '///outro-host/x',
    '/\\outro-host/x',
    '/../../outro-host',
    '\\\\outro-host\\x',
    '/g/x y/ção',
    'g/sem-barra',
    '',
  ])('rota %j continua no host novo', (rota) => {
    const resultado = linkEnderecoNovo(base, rota);
    expect(resultado).not.toBeNull();
    expect(new URL(resultado!).host).toBe(host);
    expect(new URL(resultado!).protocol).toBe('https:');
  });
});
