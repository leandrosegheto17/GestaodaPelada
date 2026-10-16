import { Folha, ListaFolha } from '../dialogos/Folha';
import { OpcaoFolha } from '../dialogos/OpcaoFolha';
import estilos from './ajuste-simulador.module.css';

export interface GrupoParaTrocar {
  /** Ex.: "Time A · Titulares". */
  titulo: string;
  jogadores: readonly { id: string; apelido: string }[];
}

interface Props {
  apelido: string;
  grupos: readonly GrupoParaTrocar[];
  aoEscolher: (idDoOutro: string) => void;
  /** Volta ao diálogo de mover. */
  aoVoltar: () => void;
  aoFechar: () => void;
}

/** "Trocar com…": os outros jogadores agrupados pelo lugar em que estão agora. */
export function TrocarCom({ apelido, grupos, aoEscolher, aoVoltar, aoFechar }: Props) {
  return (
    <Folha titulo={`Trocar ${apelido} com…`} aoFechar={aoFechar}>
      {grupos
        .filter((g) => g.jogadores.length > 0)
        .map((g) => (
          <section key={g.titulo}>
            <h3 className={estilos.grupo}>{g.titulo}</h3>
            <ListaFolha>
              {g.jogadores.map((j) => (
                <OpcaoFolha
                  key={j.id}
                  aoEscolher={() => {
                    aoEscolher(j.id);
                    aoFechar();
                  }}
                >
                  {j.apelido}
                </OpcaoFolha>
              ))}
            </ListaFolha>
          </section>
        ))}
      <ListaFolha>
        <OpcaoFolha aoEscolher={aoVoltar}>Voltar</OpcaoFolha>
      </ListaFolha>
    </Folha>
  );
}
