import { mes as esquemaMes, slug as esquemaSlug } from '@pelada/contrato';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useRankingComCache } from '../../dados/publico';
import { esquecerGrupo, grupoLembrado } from '../../pwa/armazenamento';
import { GrupoIndisponivel } from '../grupo-indisponivel/GrupoIndisponivel';
import { EsqueletoRanking } from './EsqueletoRanking';
import { SemConexao } from './SemConexao';
import { TelaRanking } from './TelaRanking';

/** Rota `/g/:slug`: valida a URL, busca o ranking público e escolhe o estado da tela. */
export function Component() {
  const { slug = '' } = useParams();
  const [parametros, definirParametros] = useSearchParams();
  const mesDaUrl = parametros.get('mes');

  const slugValido = esquemaSlug.safeParse(slug).success;
  const mesValido = mesDaUrl === null || esquemaMes.safeParse(mesDaUrl).success;
  const estado = useRankingComCache(slug, mesValido ? (mesDaUrl ?? undefined) : undefined, slugValido);
  const indisponivel = estado.tipo === 'indisponivel';

  // Mês malformado na URL: tira o parâmetro e segue com o mês corrente.
  useEffect(() => {
    if (mesValido) return;
    definirParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        novos.delete('mes');
        return novos;
      },
      { replace: true },
    );
  }, [mesValido, definirParametros]);

  // Só esquece o grupo lembrado se for este: um link digitado errado não apaga o grupo de outro.
  useEffect(() => {
    if (!indisponivel) return;
    void grupoLembrado().then((lembrado) => (lembrado === slug ? esquecerGrupo() : undefined));
  }, [indisponivel, slug]);

  if (!slugValido || estado.tipo === 'indisponivel') return <GrupoIndisponivel />;
  if (estado.tipo === 'carregando') return <EsqueletoRanking />;
  if (estado.tipo === 'erro') return <SemConexao aoTentar={estado.tentarDeNovo} />;
  return (
    <TelaRanking
      ranking={estado.ranking}
      atualizando={estado.atualizando}
      semConexaoDesde={estado.semConexaoDesde}
      aoTrocarMes={(mes) => definirParametros({ mes })}
    />
  );
}
