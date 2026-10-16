import type { GrupoDono } from '@pelada/contrato';
import { useEffect, useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import estilos from './dono.module.css';

interface Props {
  grupo: GrupoDono;
  /** Resultado da tentativa de arquivar. */
  arquivando: boolean;
  erroAoArquivar: string | undefined;
  reativando: boolean;
  aoArquivar: (nomeDigitado: string) => void;
  aoReativar: () => void;
  /** Chamado ao fechar o diálogo sem arquivar (limpa o erro). */
  aoCancelar: () => void;
}

/** Arquivar (D2 por digitação) ou reativar. Arquivar bloqueia os admins; os dados ficam guardados. */
export function ArquivamentoGrupo({
  grupo,
  arquivando,
  erroAoArquivar,
  reativando,
  aoArquivar,
  aoReativar,
  aoCancelar,
}: Props) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const estaArquivado = grupo.arquivadoEm !== null;
  // Arquivado com sucesso (ou já arquivado): o diálogo se fecha e não volta se o grupo for reativado.
  useEffect(() => {
    if (estaArquivado) setAberto(false);
  }, [estaArquivado]);
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Arquivamento
      </h2>
      <p className={estilos.paragrafo}>
        {estaArquivado
          ? 'Este grupo está arquivado: os admins não acessam e o link mostra “Grupo indisponível”. Os dados ficam guardados.'
          : 'Arquivar bloqueia o acesso dos admins, e o link passa a mostrar “Grupo indisponível”. Os dados ficam guardados.'}
      </p>
      {estaArquivado ? (
        <Botao variante="secundario" carregando={reativando} onClick={aoReativar}>
          Reativar grupo
        </Botao>
      ) : (
        <Botao variante="destrutivo" onClick={() => setAberto(true)}>
          Arquivar grupo
        </Botao>
      )}
      {aberto && !estaArquivado ? (
        <DialogoConfirmacao
          {...textosConfirmacao.arquivarGrupo(grupo.nome)}
          confirmarDigitando={{ nome: grupo.nome }}
          carregando={arquivando}
          erro={erroAoArquivar}
          aoConfirmar={() => aoArquivar(grupo.nome)}
          aoCancelar={() => {
            setAberto(false);
            aoCancelar();
          }}
        />
      ) : null}
    </section>
  );
}
