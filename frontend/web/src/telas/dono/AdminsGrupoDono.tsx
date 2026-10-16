import type { GrupoDono } from '@pelada/contrato';
import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import estilos from './dono.module.css';

interface Props {
  admins: GrupoDono['admins'];
  /** Conta do próprio dono: ela usa "Minha senha", não a redefinição por outro. */
  contaDoDono: string | undefined;
  aoRedefinir: (contaId: string) => void;
}

export function AdminsGrupoDono({ admins, contaDoDono, aoRedefinir }: Props) {
  const id = useId();
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Admins
      </h2>
      <Lista>
        {admins.map((admin) => (
          <Item
            key={admin.contaId}
            titulo={admin.nome}
            meta={admin.email}
            acoes={
              admin.contaId === contaDoDono ? undefined : (
                <Botao variante="texto" onClick={() => aoRedefinir(admin.contaId)}>
                  Redefinir senha
                </Botao>
              )
            }
          />
        ))}
      </Lista>
    </section>
  );
}
