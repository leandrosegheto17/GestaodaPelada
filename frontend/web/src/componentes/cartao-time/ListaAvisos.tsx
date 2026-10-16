import type { SugestaoDois } from '@pelada/contrato';
import { Icone } from '../basicos/Icone';
import estilos from './ListaAvisos.module.css';

type Aviso = SugestaoDois['avisos'][number];

/** Avisos da API (texto pronto). Não bloqueiam nada; sem avisos, não renderiza. */
export function ListaAvisos({ avisos }: { avisos: readonly Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <ul className={estilos.avisos} role="status">
      {avisos.map((a) => (
        <li key={`${a.tipo}-${a.texto}`}>
          <Icone nome="atencao" tamanho={18} />
          {a.texto}
        </li>
      ))}
    </ul>
  );
}
