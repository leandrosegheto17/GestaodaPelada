import type { JogadorDetalhe } from '@pelada/contrato';
import { useId, useState } from 'react';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Selo } from '../../componentes/basicos/Selo';
import { SeloSalvo } from '../../componentes/basicos/SeloSalvo';
import { ValorDestaque } from '../../componentes/basicos/ValorDestaque';
import { SeletorNota } from '../../componentes/campos/CampoNota';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { useSalvarNota } from '../../dados/notas';
import { formatarNivel } from '../../formatacao';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogador: JogadorDetalhe;
}

/**
 * Notas por habilidade e nível do jogador. Cada alteração é gravada na hora; o nível mostrado é o da API
 * (nada de média aqui). Falha ao gravar devolve o seletor ao valor salvo e avisa acima da lista.
 */
export function SecaoNotas({ grupoId, jogador }: Props) {
  const id = useId();
  const salvar = useSalvarNota(grupoId, jogador.id);
  const [pendentes, setPendentes] = useState<Record<string, number | null>>({});
  const [salvaAgora, setSalvaAgora] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const base = `/admin/${encodeURIComponent(grupoId)}`;

  const aoMudar = (habilidadeId: string, nota: number | null) => {
    setPendentes((p) => ({ ...p, [habilidadeId]: nota }));
    setFalhou(false);
    setSalvaAgora(null);
    salvar.mutate(
      { habilidadeId, nota },
      {
        onSuccess: () => setSalvaAgora(habilidadeId),
        onError: () => setFalhou(true),
        onSettled: () =>
          setPendentes((p) => {
            const resto = { ...p };
            delete resto[habilidadeId];
            return resto;
          }),
      },
    );
  };

  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Habilidades e nível
      </h2>
      {jogador.semNota ? (
        <p className={estilos.paragrafo}>
          <Selo tom="atencao">Sem nota</Selo> Usa 5,5 no simulador.
        </p>
      ) : (
        <ValorDestaque>Nível {formatarNivel(jogador.nivel)}</ValorDestaque>
      )}
      {falhou ? <Faixa tipo="erro">Não foi possível salvar a nota.</Faixa> : null}
      {jogador.notas.length === 0 ? (
        <EstadoVazio
          icone={null}
          texto="Nenhuma habilidade cadastrada."
          acao={
            <BotaoLink to={`${base}/habilidades`} variante="secundario">
              Cadastrar habilidades
            </BotaoLink>
          }
        />
      ) : (
        <Lista>
          {jogador.notas.map((n) => {
            const idCampo = `${id}-${n.habilidadeId}`;
            return (
              <Item
                key={n.habilidadeId}
                titulo={<label htmlFor={idCampo}>{n.habilidade}</label>}
                lado={salvaAgora === n.habilidadeId ? <SeloSalvo /> : null}
                acoes={
                  <SeletorNota
                    id={idCampo}
                    nota={n.habilidadeId in pendentes ? (pendentes[n.habilidadeId] ?? null) : n.nota}
                    aoMudar={(nota) => aoMudar(n.habilidadeId, nota)}
                  />
                }
              />
            );
          })}
        </Lista>
      )}
    </section>
  );
}
