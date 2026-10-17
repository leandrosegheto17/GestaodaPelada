import { useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Voltar } from '../../componentes/basicos/Voltar';
import { TabelaSemanas } from '../../componentes/listas/TabelaSemanas';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useUso } from '../../dados/uso';
import { colunasUso, linhasUso } from './linhasUso';

/** T21: uso do app por semana (contagens anônimas). Só leitura. */
export function Component() {
  const { grupoId = '' } = useParams();
  const uso = useUso(grupoId);

  if (uso.isError) {
    return (
      <>
        <h1 className="sr">Uso do app</h1>
        <ErroRede aoTentar={() => void uso.refetch()} />
      </>
    );
  }
  if (!uso.data) {
    return (
      <>
        <TituloPagina>Uso do app</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={4} />
      </>
    );
  }
  return (
    <>
      <title>Uso do app</title>
      <Voltar para={`/admin/${encodeURIComponent(grupoId)}`} rotulo="Início" />
      <TituloPagina>Uso do app</TituloPagina>
      {uso.data.semanas.length === 0 ? (
        <EstadoVazio icone={null} titulo="Ainda não há uso registrado." />
      ) : (
        <TabelaSemanas
          legenda="Uso por semana, mais recente primeiro"
          colunas={colunasUso}
          semanas={linhasUso(uso.data.semanas)}
        />
      )}
    </>
  );
}
