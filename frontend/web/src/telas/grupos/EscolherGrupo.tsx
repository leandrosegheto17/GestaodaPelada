import { rankingPublico } from '@pelada/contrato';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { BarraAdmin } from '../../componentes/barras/BarraAdmin';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Selo } from '../../componentes/basicos/Selo';
import { MenuConta } from '../../componentes/layout-admin/MenuConta';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { PaginaFormulario } from '../../componentes/pagina/PaginaFormulario';
import { recursos } from '../../config/recursos';
import { useSair, useSessao } from '../../dados/sessao';
import { descreverAgenda } from '../../formatacao/agenda';
import { rankingAtual } from '../../pwa/armazenamento';
import { decidirGrupo, destinoDoGrupo } from './decidirGrupo';

/** Nome do grupo do link, se o ranking dele já esteve neste aparelho; senão, o aviso fica sem nome. */
function useNomeDoGrupoDoLink(slug: string | null): string | null {
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => {
    setNome(null);
    if (!slug) return;
    let ativo = true;
    rankingAtual(slug)
      .then((guardado) => {
        const analise = rankingPublico.safeParse(guardado?.dados);
        if (ativo && analise.success) setNome(analise.data.grupo.nome);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [slug]);
  return nome;
}

/** T08: escolher o grupo. Com um só grupo (ou um link válido), segue direto para a tela de início. */
export function Component() {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const sessao = useSessao();
  const sair = useSair();
  const [menuAberto, setMenuAberto] = useState(false);

  const decisao = sessao.data
    ? decidirGrupo(sessao.data, { grupo: parametros.get('grupo'), area: parametros.get('area') })
    : null;
  const nomeDoLink = useNomeDoGrupoDoLink(decisao?.tipo === 'lista' ? decisao.grupoSemAcesso : null);

  if (sessao.isError) {
    return (
      <PaginaFormulario titulo="Seus grupos" barra={<BarraAdmin />}>
        <ErroRede aoTentar={() => void sessao.refetch()} />
      </PaginaFormulario>
    );
  }
  if (sessao.isPending) {
    return (
      <PaginaFormulario titulo="Seus grupos" barra={<BarraAdmin />}>
        <Esqueleto variante="bloco" quantidade={3} />
      </PaginaFormulario>
    );
  }
  if (!sessao.data || !decisao) return null;
  if (decisao.tipo === 'redirecionar') return <Navigate to={decisao.para} replace />;

  if (decisao.tipo === 'vazio') {
    return (
      <PaginaFormulario titulo="Seus grupos" barra={<BarraAdmin />}>
        <EstadoVazio
          titulo="Nenhum grupo"
          texto="Você não é admin de nenhum grupo. Fale com o dono da plataforma."
          acao={
            <Botao
              variante="secundario"
              carregando={sair.isPending}
              onClick={() => sair.mutate(undefined, { onSuccess: () => void navegar('/', { replace: true }) })}
            >
              Sair
            </Botao>
          }
        />
      </PaginaFormulario>
    );
  }

  const financeiroLigado = recursos.ligado('financeiro');
  const aviso = nomeDoLink
    ? `Você não é admin de “${nomeDoLink}”. Escolha um dos seus grupos.`
    : 'Você não é admin desse grupo. Escolha um dos seus grupos.';
  return (
    <PaginaFormulario
      titulo="Seus grupos"
      barra={<BarraAdmin menuAberto={menuAberto} aoAbrirMenu={() => setMenuAberto(true)} />}
    >
      {decisao.grupoSemAcesso ? <Faixa tipo="atencao">{aviso}</Faixa> : null}
      <Lista>
        {sessao.data.grupos.map((grupo) => (
          <Item
            key={grupo.id}
            titulo={grupo.nome}
            meta={descreverAgenda(grupo)}
            selo={financeiroLigado && !grupo.acessaFinanceiro ? <Selo>Sem acesso ao financeiro</Selo> : undefined}
            para={destinoDoGrupo(grupo)}
          />
        ))}
      </Lista>
      {menuAberto ? <MenuConta conta={sessao.data.conta} aoFechar={() => setMenuAberto(false)} /> : null}
    </PaginaFormulario>
  );
}
