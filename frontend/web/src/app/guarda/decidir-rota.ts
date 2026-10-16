import type { SessaoEu } from '@pelada/contrato';
import { destinoDeEntrada, lerDestino } from '../../dados/destino';

const ROTA_NOVA_SENHA = '/entrar/nova-senha';
const AREA_ADMIN = /^\/(admin|conta|dono)(\/|$)/;

const ehNovaSenha = (pathname: string) => pathname === ROTA_NOVA_SENHA || pathname.startsWith(`${ROTA_NOVA_SENHA}/`);
const ehProtegida = (pathname: string) => AREA_ADMIN.test(pathname) || ehNovaSenha(pathname);

/**
 * Para onde redirecionar, ou `null` para deixar a rota abrir. É conveniência de navegação:
 * quem autoriza de verdade é a API.
 */
export function decidirRota(
  sessao: SessaoEu | null,
  { pathname, search }: { pathname: string; search: string },
): string | null {
  if (!ehProtegida(pathname)) return null;
  if (sessao === null) return ehNovaSenha(pathname) ? '/entrar' : destinoDeEntrada(pathname, search);
  if (sessao.escopo === 'troca_de_senha') return ehNovaSenha(pathname) ? null : ROTA_NOVA_SENHA;

  const [, area, grupoId] = pathname.split('/');
  if (area === 'admin' && grupoId && !sessao.grupos.some((g) => g.id === grupoId)) return '/admin';
  if (area === 'dono' && !sessao.conta.eDono) return '/admin';
  return null;
}

/** Para onde ir logo depois de entrar ou trocar a senha. */
export function destinoAposEntrar(sessao: SessaoEu, destino: string | null | undefined): string {
  const valido = lerDestino(destino);
  // Na troca de senha obrigatória, o destino segue junto para a tela de nova senha continuar o fluxo.
  if (sessao.escopo === 'troca_de_senha') {
    return valido ? `${ROTA_NOVA_SENHA}?destino=${encodeURIComponent(valido)}` : ROTA_NOVA_SENHA;
  }
  if (valido) return valido;
  return sessao.conta.eDono ? '/dono' : '/admin';
}
