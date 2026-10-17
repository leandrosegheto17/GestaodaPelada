import type { PainelDono } from '@pelada/contrato';
import { useId, useState } from 'react';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Selo } from '../../componentes/basicos/Selo';
import { Segmentado } from '../../componentes/escolhas/Segmentado';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { dataCompleta } from '../../formatacao';
import { diaEFrequencia } from '../../formatacao/agenda';
import { ROTULO_SITUACAO_COMERCIAL } from '../../rotulos';
import estilos from './dono.module.css';
import { caminhoGrupoDono, caminhoNovoGrupo } from './navegacao';

type Grupo = PainelDono['grupos'][number];
type Filtro = 'ativos' | 'arquivados';

/** Grupos da plataforma (só metadados, RF-07): filtro Ativos/Arquivados e link para cada um. */
export function GruposDono({ grupos }: { grupos: readonly Grupo[] }) {
  const id = useId();
  const [filtro, setFiltro] = useState<Filtro>('ativos');
  const ativos = grupos.filter((g) => g.arquivadoEm === null);
  const arquivados = grupos.filter((g) => g.arquivadoEm !== null);
  const itens = filtro === 'ativos' ? ativos : arquivados;
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Grupos
      </h2>
      {grupos.length === 0 ? (
        <EstadoVazio
          icone={null}
          texto="Nenhum grupo criado."
          acao={<BotaoLink to={caminhoNovoGrupo}>Novo grupo</BotaoLink>}
        />
      ) : (
        <>
          <Segmentado<Filtro>
            legenda="Mostrar"
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'ativos', rotulo: `Ativos (${ativos.length})` },
              { valor: 'arquivados', rotulo: `Arquivados (${arquivados.length})` },
            ]}
          />
          {itens.length === 0 ? (
            <EstadoVazio icone={null} texto={filtro === 'ativos' ? 'Nenhum grupo ativo.' : 'Nenhum grupo arquivado.'} />
          ) : (
            <Lista>
              {itens.map((grupo) => (
                <Item
                  key={grupo.id}
                  titulo={grupo.nome}
                  meta={
                    <>
                      {diaEFrequencia(grupo)} {'·'} {grupo.horario} {'·'}{' '}
                      {ROTULO_SITUACAO_COMERCIAL[grupo.situacaoComercial]}
                      <br />
                      Admins: {grupo.admins.join(', ')} {'·'} criado em {dataCompleta(grupo.criadoEm)}
                    </>
                  }
                  selo={grupo.arquivadoEm ? <Selo>arquivado</Selo> : undefined}
                  para={caminhoGrupoDono(grupo.id)}
                />
              ))}
            </Lista>
          )}
        </>
      )}
    </section>
  );
}
