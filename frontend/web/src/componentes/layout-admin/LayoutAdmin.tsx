import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatches, useNavigate, useParams } from 'react-router';
import { recursos } from '../../config/recursos';
import { chaveSessao, useMarcarAvisoVisto, useSessao } from '../../dados/sessao';
import { ErroApi } from '../../dados/erros';
import { useGrupo } from '../../dados/grupo';
import { AvisoEnderecoNovo } from '../aviso-endereco-novo';
import { DialogoPrivacidade } from '../aviso-privacidade';
import { BarraAdmin } from '../barras/BarraAdmin';
import { PularConteudo } from '../barras/PularConteudo';
import { MenuConta } from './MenuConta';
import estilos from './LayoutAdmin.module.css';

/** Moldura das telas do admin de um grupo: barra, aviso de endereço novo e menu da conta. */
export function LayoutAdmin() {
  const { grupoId = '' } = useParams();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const sessao = useSessao();
  // Só as telas que declaram `handle: { atalhos: true }` mostram "Ver ranking" e o menu da conta.
  const comAtalhos = useMatches().some((m) => (m.handle as { atalhos?: boolean } | undefined)?.atalhos === true);
  const grupo = useGrupo(grupoId);
  const [menuAberto, setMenuAberto] = useState(false);
  const marcarAviso = useMarcarAvisoVisto();

  // Vínculo removido depois de a sessão ter sido lida: volta à lista de grupos.
  const naoEncontrado = grupo.error instanceof ErroApi && grupo.error.status === 404;
  useEffect(() => {
    if (!naoEncontrado) return;
    void cliente.invalidateQueries({ queryKey: chaveSessao });
    navegar('/admin', { replace: true });
  }, [naoEncontrado, cliente, navegar]);

  // Navegar por uma opção do menu fecha a folha.
  useEffect(() => setMenuAberto(false), [pathname]);

  const dadosSessao = sessao.data ?? null;
  const dadosGrupo = grupo.data?.grupo;
  // Até o GET do grupo responder, a barra usa o nome que a sessão já trouxe.
  const nomeProvisorio = dadosSessao?.grupos.find((g) => g.id === grupoId)?.nome;
  return (
    <>
      <PularConteudo />
      <BarraAdmin
        {...(dadosGrupo ? { nomeGrupo: dadosGrupo.nome } : {})}
        {...(comAtalhos && dadosGrupo ? { destinoRanking: `/g/${dadosGrupo.slug}` } : {})}
        {...(!dadosGrupo && nomeProvisorio ? { nomeGrupo: nomeProvisorio } : {})}
        {...(dadosSessao && dadosSessao.grupos.length > 1 ? { destinoTrocarGrupo: '/admin' } : {})}
        menuAberto={menuAberto}
        {...(comAtalhos ? { aoAbrirMenu: () => setMenuAberto(true) } : {})}
      />
      <AvisoEnderecoNovo enderecoNovo={dadosSessao?.enderecoNovo} />
      <main id="conteudo" tabIndex={-1} className={estilos.conteudo}>
        <Outlet />
      </main>
      {recursos.ligado('privacidade') && dadosSessao && !dadosSessao.avisoPrivacidadeVisto ? (
        <DialogoPrivacidade
          aoEntender={() => marcarAviso.mutate()}
          enviando={marcarAviso.isPending}
          erro={marcarAviso.isError}
        />
      ) : null}
      {menuAberto && dadosSessao ? (
        <MenuConta conta={dadosSessao.conta} grupoId={grupoId} aoFechar={() => setMenuAberto(false)} />
      ) : null}
    </>
  );
}
