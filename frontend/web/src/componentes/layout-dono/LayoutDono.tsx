import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useSessao } from '../../dados/sessao';
import { AvisoEnderecoNovo } from '../aviso-endereco-novo';
import { BarraDono } from '../barras/BarraDono';
import { PularConteudo } from '../barras/PularConteudo';
import { MenuConta } from '../layout-admin/MenuConta';
import estilos from '../layout-admin/LayoutAdmin.module.css';

/** Moldura da área do dono: barra, menu da conta e o conteúdo da tela. */
export function LayoutDono() {
  const { pathname } = useLocation();
  const sessao = useSessao();
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => setMenuAberto(false), [pathname]);

  const dados = sessao.data ?? null;
  const tambemAdmin = (dados?.grupos.length ?? 0) > 0;
  return (
    <>
      <PularConteudo />
      <BarraDono
        {...(tambemAdmin ? { destinoMeusGrupos: '/admin' } : {})}
        menuAberto={menuAberto}
        aoAbrirMenu={() => setMenuAberto(true)}
      />
      <AvisoEnderecoNovo enderecoNovo={dados?.enderecoNovo} />
      <main id="conteudo" tabIndex={-1} className={estilos.conteudo}>
        <Outlet />
      </main>
      {menuAberto && dados ? <MenuConta conta={dados.conta} aoFechar={() => setMenuAberto(false)} /> : null}
    </>
  );
}
