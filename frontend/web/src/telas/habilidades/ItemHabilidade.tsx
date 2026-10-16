import { habilidadeCorpo, type Habilidade } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { SeloSalvo } from '../../componentes/basicos/SeloSalvo';
import { juntar } from '../../componentes/basicos/juntar';
import { Item } from '../../componentes/listas/Item';
import { ErroApi } from '../../dados/erros';
import { deErroApi, deValidacao } from '../../dados/errosDeCampos';
import { useRenomearHabilidade } from '../../dados/habilidades';
import estilos from './habilidades.module.css';

interface Props {
  grupoId: string;
  habilidade: Habilidade;
  /** Posição na lista (a partir de 1), só para o nome acessível do campo. */
  posicao: number;
  aoExcluir: () => void;
}

const SEM_CONEXAO = 'Não foi possível salvar. Verifique a conexão e tente de novo.';

/**
 * Habilidade com o nome editável no lugar: grava ao sair do campo ou com Enter, só se o nome mudou e é
 * válido; Esc volta ao nome salvo. O erro do servidor (nome repetido) aparece sob o campo.
 */
export function ItemHabilidade({ grupoId, habilidade, posicao, aoExcluir }: Props) {
  const renomear = useRenomearHabilidade(grupoId);
  const [nome, setNome] = useState(habilidade.nome);
  const [erro, setErro] = useState<string | undefined>();
  const [salvo, setSalvo] = useState(false);
  const idCampo = `habilidade-${habilidade.id}`;
  const idErro = `${idCampo}-erro`;

  const gravar = () => {
    if (nome === habilidade.nome) {
      setErro(undefined);
      return;
    }
    const analise = habilidadeCorpo.safeParse({ nome });
    if (!analise.success) {
      setErro(deValidacao(analise).nome);
      return;
    }
    setErro(undefined);
    setSalvo(false);
    renomear.mutate(
      { id: habilidade.id, nome: analise.data.nome },
      {
        onSuccess: (atual) => {
          setNome(atual.nome);
          setSalvo(true);
        },
        onError: (falha) => {
          const doCampo = falha instanceof ErroApi && falha.status === 422 ? deErroApi(falha) : null;
          setErro(doCampo?.['nome'] ?? SEM_CONEXAO);
        },
      },
    );
  };

  return (
    <Item
      titulo={
        <>
          <label className="sr" htmlFor={idCampo}>
            Nome da habilidade {posicao}
          </label>
          <input
            id={idCampo}
            className={juntar(estilos.entrada, erro && estilos.comErro)}
            value={nome}
            maxLength={30}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            onChange={(e) => {
              setNome(e.target.value);
              setSalvo(false);
            }}
            onBlur={gravar}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                gravar();
              } else if (e.key === 'Escape') {
                setNome(habilidade.nome);
                setErro(undefined);
              }
            }}
          />
        </>
      }
      meta={
        erro ? (
          <span id={idErro} className={estilos.erro} role="alert">
            {erro}
          </span>
        ) : null
      }
      selo={salvo ? <SeloSalvo /> : null}
      acoes={
        <Botao variante="textoDestrutivo" onClick={aoExcluir}>
          Excluir<span className="sr"> {habilidade.nome}</span>
        </Botao>
      }
    />
  );
}
