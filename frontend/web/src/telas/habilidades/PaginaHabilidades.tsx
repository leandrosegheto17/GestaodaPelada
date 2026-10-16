import { useState } from 'react';
import { useParams } from 'react-router';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { Lista } from '../../componentes/listas/Lista';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useExcluirHabilidade, useHabilidades } from '../../dados/habilidades';
import { ItemHabilidade } from './ItemHabilidade';
import { NovaHabilidade } from './NovaHabilidade';
import estilos from './habilidades.module.css';

/** T17: catálogo de habilidades do grupo. */
export function Component() {
  const { grupoId = '' } = useParams();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const habilidades = useHabilidades(grupoId);
  const excluir = useExcluirHabilidade(grupoId);
  const [excluindo, setExcluindo] = useState<{ id: string; nome: string } | null>(null);
  const [erroDeAcao, setErroDeAcao] = useState<string | null>(null);

  if (habilidades.isError) {
    return (
      <>
        <h1 className="sr">Habilidades</h1>
        <ErroRede aoTentar={() => void habilidades.refetch()} />
      </>
    );
  }
  if (!habilidades.data) {
    return (
      <div className={estilos.estreito}>
        <TituloPagina>Habilidades</TituloPagina>
        <p className="sr" role="status">
          Carregando…
        </p>
        <Esqueleto variante="bloco" quantidade={3} />
      </div>
    );
  }

  const lista = habilidades.data.habilidades;
  const aoConfirmarExclusao = () => {
    if (!excluindo) return;
    excluir.mutate(excluindo.id, {
      onSuccess: () => setExcluindo(null),
      onError: () => {
        setExcluindo(null);
        setErroDeAcao('Não foi possível excluir. Verifique a conexão e tente de novo.');
      },
    });
  };

  return (
    <div className={estilos.estreito}>
      <title>Habilidades</title>
      <Voltar para={base} rotulo="Início" />
      <TituloPagina>Habilidades</TituloPagina>
      {erroDeAcao ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">{erroDeAcao}</Faixa>
        </div>
      ) : null}
      {lista.length === 0 ? (
        <EstadoVazio icone={null} titulo="Nenhuma habilidade" texto="O simulador vai usar nível 5,5 para todos." />
      ) : (
        <Lista>
          {lista.map((h, i) => (
            <ItemHabilidade
              key={h.id}
              grupoId={grupoId}
              habilidade={h}
              posicao={i + 1}
              aoExcluir={() => {
                setErroDeAcao(null);
                setExcluindo({ id: h.id, nome: h.nome });
              }}
            />
          ))}
        </Lista>
      )}
      <NovaHabilidade grupoId={grupoId} />
      {excluindo ? (
        <DialogoConfirmacao
          {...textosConfirmacao.excluirHabilidade(excluindo.nome)}
          carregando={excluir.isPending}
          aoConfirmar={aoConfirmarExclusao}
          aoCancelar={() => setExcluindo(null)}
        />
      ) : null}
    </div>
  );
}
