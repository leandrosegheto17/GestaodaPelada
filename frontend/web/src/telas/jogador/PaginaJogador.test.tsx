import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaJogador } from './PaginaJogador';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
  xPelada: string | null;
}
let chamadas: Chamada[] = [];

interface Opcoes {
  jogador?: JsonBodyType;
  /** Ficha devolvida depois de gravar a nova data de início. */
  jogadorDepoisDoInicio?: JsonBodyType;
  escrita?: (metodo: string) => Response;
}

function api({ jogador = fixture('jogador-toninho.json'), jogadorDepoisDoInicio, escrita }: Opcoes = {}) {
  chamadas = [];
  let fichaAtual = jogador;
  const registrar = async (metodo: string, request: Request) => {
    const texto = await request.text();
    chamadas.push({
      metodo,
      caminho: new URL(request.url).pathname,
      corpo: texto ? JSON.parse(texto) : null,
      xPelada: request.headers.get('x-pelada'),
    });
    return escrita?.(metodo);
  };
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get('/api/grupos/g-quinta/jogadores/j-toninho', () => HttpResponse.json(fichaAtual)),
    http.post('/api/grupos/g-quinta/jogadores', async ({ request }) => {
      const resposta = await registrar('POST', request);
      return resposta ?? HttpResponse.json(fixture('jogador-toninho.json'), { status: 201 });
    }),
    http.patch('/api/grupos/g-quinta/jogadores/j-toninho', async ({ request }) => {
      const resposta = await registrar('PATCH', request);
      return resposta ?? HttpResponse.json(jogador);
    }),
    http.post('/api/grupos/g-quinta/jogadores/j-toninho/inicio/previa', async ({ request }) => {
      const resposta = await registrar('POST', request);
      return resposta ?? HttpResponse.json(fixture('inicio-previa-avancar.json'));
    }),
    http.put('/api/grupos/g-quinta/jogadores/j-toninho/inicio', async ({ request }) => {
      const resposta = await registrar('PUT', request);
      if (jogadorDepoisDoInicio) fichaAtual = jogadorDepoisDoInicio;
      return resposta ?? HttpResponse.json({ inicio: '2026-10-01', alterado: true });
    }),
    http.post('/api/grupos/g-quinta/jogadores/j-toninho/inativar', async ({ request }) => {
      const resposta = await registrar('POST', request);
      return resposta ?? HttpResponse.json(jogador);
    }),
    http.post('/api/grupos/g-quinta/jogadores/j-toninho/reativar', async ({ request }) => {
      const resposta = await registrar('POST', request);
      return resposta ?? HttpResponse.json(jogador);
    }),
    http.delete('/api/grupos/g-quinta/jogadores/j-toninho', async ({ request }) => {
      const resposta = await registrar('DELETE', request);
      return resposta ?? new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar(rota: string) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/jogadores/novo', Component: PaginaJogador },
      { path: '/admin/:grupoId/jogadores/:jogadorId', Component: PaginaJogador },
      { path: '/admin/:grupoId/jogadores', element: <p>Lista de jogadores</p> },
    ],
    { initialEntries: [rota] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

const NOVO = '/admin/g-quinta/jogadores/novo';
const FICHA = '/admin/g-quinta/jogadores/j-toninho';
const API_FICHA = '/api/grupos/g-quinta/jogadores/j-toninho';

async function preencherNovo() {
  await userEvent.type(await screen.findByLabelText('Apelido'), 'Rodrigo');
  await userEvent.type(screen.getByLabelText('Ano de nascimento'), '1990');
  await userEvent.selectOptions(screen.getByLabelText('Posição'), 'goleiro');
  await userEvent.type(screen.getByLabelText('Telefone (opcional)'), '11987654321');
}

describe('PaginaJogador (T16): novo', () => {
  it('campos com as ajudas do mockup e data de entrada = hoje da API', async () => {
    api();
    montar(NOVO);
    expect(await screen.findByLabelText('Apelido')).toHaveAccessibleDescription(
      'De 2 a 30 caracteres. É o nome que aparece no ranking.',
    );
    expect(screen.getByLabelText('Posição')).toHaveAccessibleDescription('Só para cadastro.');
    expect(screen.getByLabelText('Data de entrada')).toHaveValue('2026-10-22');
    expect(screen.getByLabelText('Ano de nascimento')).toHaveAttribute('max', '2016');
  });

  it('máscara do telefone enquanto digita; POST com o corpo esperado e X-Pelada; vai para a ficha', async () => {
    api();
    const { roteador } = montar(NOVO);
    await preencherNovo();
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('(11) 98765-4321');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe(FICHA));
    expect(await screen.findByText('Jogador salvo')).toBeInTheDocument();
    expect(screen.getByText('Jogador salvo').closest('[role="status"]')).not.toBeNull();
    expect(chamadas[0]).toMatchObject({
      metodo: 'POST',
      xPelada: '1',
      corpo: {
        apelido: 'Rodrigo',
        anoNascimento: 1990,
        posicao: 'goleiro',
        telefone: '11987654321',
        pontuacaoInicial: 0,
        dataEntrada: '2026-10-22',
      },
    });
  });

  it('seletor de posição com as 7 opções do legado, na ordem', async () => {
    api();
    montar(NOVO);
    const seletor = await screen.findByLabelText('Posição');
    expect(
      within(seletor)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Escolha', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Atacante', 'Centroavante', 'Goleiro']);
  });

  it('pontuação inicial: campo com 0 e a ajuda do mockup; o valor digitado vai no corpo', async () => {
    api();
    const { roteador } = montar(NOVO);
    const campo = await screen.findByLabelText('Pontuação inicial');
    expect(campo).toHaveValue(0);
    expect(campo).toHaveAccessibleDescription('Pontos de antes da 1ª partida no app (0 a 9999).');
    await preencherNovo();
    await userEvent.clear(campo);
    await userEvent.type(campo, '123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe(FICHA));
    expect(chamadas[0]?.corpo).toMatchObject({ pontuacaoInicial: 123 });
  });

  it.each([['-1'], ['10000'], ['1.5'], ['']])('pontuação inicial %j é recusada no campo, sem POST', async (valor) => {
    api();
    montar(NOVO);
    await preencherNovo();
    const campo = screen.getByLabelText('Pontuação inicial');
    await userEvent.clear(campo);
    if (valor) await userEvent.type(campo, valor);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um número inteiro de 0 a 9999.')).toBeInTheDocument();
    expect(screen.getByLabelText('Pontuação inicial')).toBeInvalid();
    expect(chamadas).toHaveLength(0);
  });

  it('ano 2017 (menos de 10 anos) vira erro do contrato, sem POST', async () => {
    api();
    montar(NOVO);
    await userEvent.type(await screen.findByLabelText('Apelido'), 'Rodrigo');
    await userEvent.type(screen.getByLabelText('Ano de nascimento'), '2017');
    await userEvent.selectOptions(screen.getByLabelText('Posição'), 'goleiro');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O ano precisa estar entre 1940 e 2016.');
    expect(chamadas).toHaveLength(0);
  });

  it('2 erros mostram o resumo e os links focam os campos', async () => {
    api();
    montar(NOVO);
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Corrija \d campos:/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Apelido' }));
    expect(screen.getByLabelText('Apelido')).toHaveFocus();
  });

  it('422 do servidor aparece nos campos', async () => {
    api({ escrita: () => HttpResponse.json(fixture('erro-validacao.json'), { status: 422 }) });
    montar(NOVO);
    await preencherNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Já existe um jogador com esse apelido neste grupo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Apelido')).toBeInvalid();
  });

  it('falha de rede mantém o que foi digitado', async () => {
    api({ escrita: () => HttpResponse.error() });
    montar(NOVO);
    await preencherNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível enviar. Verifique a conexão.')).toBeInTheDocument();
    expect(screen.getByLabelText('Apelido')).toHaveValue('Rodrigo');
  });

  it('sem violações do axe', async () => {
    api();
    const { container } = montar(NOVO);
    await screen.findByLabelText('Apelido');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('PaginaJogador (T16): ficha', () => {
  it('mostra os dados, o telefone formatado e a situação', async () => {
    api();
    montar(FICHA);
    expect(await screen.findByRole('heading', { level: 1, name: 'Toninho' })).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('(11) 98765-4321');
    expect(screen.getByText('Ativo desde 05/02/2026.')).toBeInTheDocument();
  });

  it('a edição carrega a pontuação inicial e a envia no PATCH', async () => {
    const base = fixture('jogador-toninho.json') as Record<string, JsonBodyType>;
    api({ jogador: { ...base, pontuacaoInicial: 77 } });
    montar(FICHA);
    const campo = await screen.findByLabelText('Pontuação inicial');
    expect(campo).toHaveValue(77);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(chamadas[0]?.metodo).toBe('PATCH'));
    expect(chamadas[0]?.corpo).toMatchObject({ pontuacaoInicial: 77 });
  });

  it('salvar envia PATCH e mostra "Jogador salvo"', async () => {
    api();
    montar(FICHA);
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Jogador salvo')).toBeInTheDocument();
    expect(chamadas[0]?.metodo).toBe('PATCH');
  });

  it('inativar: diálogo com a data de hoje, POST com dataSaida', async () => {
    api();
    montar(FICHA);
    await userEvent.click(await screen.findByRole('button', { name: 'Inativar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Inativar Toninho' });
    expect(within(dialogo).getByLabelText('Data de saída')).toHaveValue('2026-10-22');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Inativar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(chamadas[0]).toMatchObject({
      metodo: 'POST',
      caminho: `${API_FICHA}/inativar`,
      corpo: { dataSaida: '2026-10-22' },
    });
  });

  it('edição: "Data de início" em texto (dd/mm/aaaa), sem campo editável de entrada e sem dataEntrada no PATCH', async () => {
    const base = fixture('jogador-toninho.json') as Record<string, JsonBodyType>;
    api({ jogador: { ...base, situacao: { ativo: true, desde: '2026-03-01' }, inicioPontuacao: '2026-02-05' } });
    montar(FICHA);
    await screen.findByLabelText('Pontuação inicial');
    expect(screen.queryByLabelText('Data de entrada')).toBeNull();
    expect(screen.queryByLabelText('Data de início')).toBeNull();
    expect(screen.getByText('Data de início')).toBeInTheDocument();
    expect(screen.getByText('05/02/2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar data de início' })).toHaveAccessibleDescription('05/02/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(chamadas[0]?.metodo).toBe('PATCH'));
    expect(chamadas[0]?.corpo).not.toHaveProperty('dataEntrada');
  });

  it('alterar a data de início: prévia, confirmação, faixa, ficha recarregada e foco de volta ao botão', async () => {
    const base = fixture('jogador-toninho.json') as Record<string, JsonBodyType>;
    api({ jogadorDepoisDoInicio: { ...base, inicioPontuacao: '2026-10-01' } });
    montar(FICHA);
    const botao = await screen.findByRole('button', { name: 'Alterar data de início' });
    await userEvent.click(botao);
    const dialogo = await screen.findByRole('dialog', { name: 'Alterar data de início' });
    const campo = within(dialogo).getByLabelText('Data de início');
    expect(campo).toHaveValue('2026-02-05');
    expect(campo).toHaveFocus();
    fireEvent.change(campo, { target: { value: '2026-10-01' } });
    await within(dialogo).findByText('Acumulado de 18 pontos passa a 11; posição de 5 para 7.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar nova data' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Data de início alterada')).toBeInTheDocument();
    expect(await screen.findByText('01/10/2026')).toBeInTheDocument();
    expect(botao).toHaveFocus();
    expect(chamadas.map((c) => [c.metodo, c.caminho, c.corpo])).toEqual([
      ['POST', `${API_FICHA}/inicio/previa`, { data: '2026-10-01' }],
      ['PUT', `${API_FICHA}/inicio`, { data: '2026-10-01' }],
    ]);
  });

  it('Esc e Cancelar fecham o diálogo da data de início sem gravar', async () => {
    api();
    montar(FICHA);
    const botao = await screen.findByRole('button', { name: 'Alterar data de início' });
    await userEvent.click(botao);
    await screen.findByRole('dialog', { name: 'Alterar data de início' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(botao).toHaveFocus();
    await userEvent.click(botao);
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Data de início alterada')).toBeNull();
    expect(chamadas).toEqual([]);
  });

  it('inativo: o texto de reativar diz que data de início e pontos não mudam', async () => {
    const base = fixture('jogador-toninho.json') as Record<string, JsonBodyType>;
    api({ jogador: { ...base, situacao: { ativo: false, desde: '2026-08-31' } } });
    montar(FICHA);
    expect(
      await screen.findByText('Volta a aparecer no ranking e nas partidas; a data de início e os pontos não mudam.'),
    ).toBeInTheDocument();
  });

  it('inativo: Reativar abre o diálogo e envia POST /reativar com a data de retorno', async () => {
    const base = fixture('jogador-toninho.json') as Record<string, JsonBodyType>;
    api({ jogador: { ...base, situacao: { ativo: false, desde: '2026-08-31' } } });
    montar(FICHA);
    expect(await screen.findByText('Inativo desde 31/08/2026.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reativar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Reativar Toninho' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reativar' }));
    await waitFor(() => expect(chamadas[0]?.caminho).toBe(`${API_FICHA}/reativar`));
    expect(chamadas[0]?.corpo).toEqual({ dataRetorno: '2026-10-22' });
  });

  it('excluir: D2 com foco em Cancelar; 204 volta à lista', async () => {
    api();
    const { roteador } = montar(FICHA);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir jogador' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Excluir Toninho?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir jogador' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta/jogadores'));
    expect(chamadas[0]?.metodo).toBe('DELETE');
  });

  it('409 com histórico mostra a mensagem e "Inativar em vez disso" abre o diálogo', async () => {
    api({ escrita: () => HttpResponse.json(fixture('erro-jogador-com-historico.json'), { status: 409 }) });
    montar(FICHA);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir jogador' }));
    const dialogo = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir jogador' }));
    expect(await screen.findByText('Toninho tem histórico de partidas e não pode ser excluído.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Inativar em vez disso' }));
    expect(await screen.findByRole('dialog', { name: 'Inativar Toninho' })).toBeInTheDocument();
  });

  it('sem violações do axe: ficha e diálogo de inativar', async () => {
    api();
    const { container } = montar(FICHA);
    await screen.findByRole('heading', { level: 1, name: 'Toninho' });
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(await violacoes(await screen.findByRole('dialog'))).toEqual([]);
  });

  it('sem violações do axe: diálogo da data de início', async () => {
    api();
    montar(FICHA);
    await userEvent.click(await screen.findByRole('button', { name: 'Alterar data de início' }));
    expect(await violacoes(await screen.findByRole('dialog', { name: 'Alterar data de início' }))).toEqual([]);
  });
});
