import { mes as esquemaMes, slug as esquemaSlug } from '@pelada/contrato';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ErroApi } from '../../dados/erros';
import { useRankingPublico } from '../../dados/publico';
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
  const consulta = useRankingPublico(slug, mesValido ? (mesDaUrl ?? undefined) : undefined, slugValido);
  const indisponivel = consulta.error instanceof ErroApi && consulta.error.status === 404;

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

  if (!slugValido || indisponivel) return <GrupoIndisponivel />;
  if (consulta.isPending) return <EsqueletoRanking />;
  if (consulta.isError) return <SemConexao aoTentar={() => void consulta.refetch()} />;
  return <TelaRanking ranking={consulta.data} aoTrocarMes={(mes) => definirParametros({ mes })} />;
}
