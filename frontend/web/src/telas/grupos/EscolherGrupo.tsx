import { useState } from 'react';
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
import { decidirGrupo, destinoDoGrupo } from './decidirGrupo';

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
          icone={null}
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
  return (
    <PaginaFormulario
      titulo="Seus grupos"
      barra={<BarraAdmin menuAberto={menuAberto} aoAbrirMenu={() => setMenuAberto(true)} />}
    >
      {decisao.grupoSemAcesso ? (
        <Faixa tipo="atencao">Você não é admin desse grupo. Escolha um dos seus grupos.</Faixa>
      ) : null}
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
