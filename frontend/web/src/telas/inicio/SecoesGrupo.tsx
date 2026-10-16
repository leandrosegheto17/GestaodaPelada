import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import type { SecaoDoGrupo } from './metasSecoes';
import estilos from './inicio.module.css';

interface Props {
  grupoId: string;
  secoes: readonly SecaoDoGrupo[];
}

export function SecoesGrupo({ grupoId, secoes }: Props) {
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  return (
    <>
      <h2 className={estilos.subtitulo}>Gerenciar</h2>
      <Lista>
        {secoes.map((s) => (
          <Item key={s.id} titulo={s.titulo} meta={s.meta} para={`${base}/${s.rota}`} />
        ))}
      </Lista>
    </>
  );
}
