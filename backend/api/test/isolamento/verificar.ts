import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import type { AppEnv } from '../../src/entrada/app.js';
import { expect } from 'vitest';
import type { Cenario } from '../apoio/cenario-acesso.js';
import { clienteTeste } from '../apoio/cliente.js';
import { relogioFixo } from '../apoio/relogio.js';
import type { Caso } from './casos.js';

export type Montar = (app: Hono<AppEnv>) => void;

interface Opcoes {
  /** Registra rotas extras no app de cada cliente (testes da própria suíte). */
  montar?: Montar;
}

function resolverCaminho(caminho: string, cenario: Cenario, extras: Record<string, string>): string {
  return caminho.replace(/:([A-Za-z]+)/g, (_t, nome: string) => {
    if (nome === 'grupoId') return cenario.grupoA.id;
    return extras[nome] ?? randomUUID();
  });
}

/** Executa o caso contra o app completo, com os clientes do cenário. Falha se o isolamento não vale. */
export async function verificarCaso(chave: string, caso: Caso, cenario: Cenario, opcoes: Opcoes = {}): Promise<void> {
  const [metodo = 'GET', caminho = ''] = chave.split(' ');
  if (caso.tipo === 'nao_se_aplica') {
    expect(caso.justificativa.trim(), `${chave}: justificativa vazia`).not.toBe('');
    return;
  }
  const extras = caso.parametros?.(cenario) ?? {};
  const url = resolverCaminho(caminho, cenario, extras);
  const clienteDe = (cookie: string) => {
    const c = clienteTeste({ relogio: relogioFixo('2026-10-16'), cookie });
    opcoes.montar?.(c.app);
    return c;
  };
  const chamar = (cookie: string) => {
    const c = clienteDe(cookie);
    const corpo = caso.corpo ?? {};
    switch (metodo) {
      case 'GET':
        return c.get(url);
      case 'DELETE':
        return c.delete(url);
      case 'PUT':
        return c.put(url, corpo);
      case 'PATCH':
        return c.patch(url, corpo);
      default:
        return c.post(url, corpo);
    }
  };

  if (caso.tipo === 'dono') {
    for (const quem of [cenario.adminA, cenario.adminB]) {
      const r = await chamar(quem.cookie);
      expect(r.status, `${chave}: conta comum deveria receber 404`).toBe(404);
    }
    return;
  }

  // grupo e financeiro: quem é admin só de B e o dono sem vínculo não alcançam o grupo A
  for (const intruso of [cenario.adminB, cenario.dono]) {
    const r = await chamar(intruso.cookie);
    expect(r.status, `${chave}: acesso cruzado deveria receber 404`).toBe(404);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'nao_encontrado' } });
  }
  if (caso.tipo === 'financeiro') {
    // quem é admin do mesmo grupo, mas sem a permissão, recebe 403 (nunca 404)
    const r = await chamar(cenario.adminASemFinanceiro.cookie);
    expect(r.status, `${chave}: admin sem financeiro deveria receber 403`).toBe(403);
  }
}
