import { inativarCorpo } from '@pelada/contrato';
import { useEffect, useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { CampoData } from '../../componentes/campos/CampoData';
import { Dialogo } from '../../componentes/dialogos/Dialogo';
import { deValidacao, mensagemDoCampo } from '../../dados/errosDeCampos';

interface Props {
  apelido: string;
  /** "Hoje" da API: data de saída padrão e maior data aceita. */
  hoje: string;
  enviando: boolean;
  /** Erro da última tentativa: o 422 da API aparece no campo; qualquer outro vira alerta de conexão. */
  erro: unknown;
  aoInativar: (dataSaida: string) => void;
  aoCancelar: () => void;
}

/** Inativar com data de saída (não destrutivo: Esc fecha). Só a data futura/inválida é checada aqui; o resto é recusa da API. */
export function DialogoInativar({ apelido, hoje, enviando, erro: erroDaApi, aoInativar, aoCancelar }: Props) {
  const [saida, setSaida] = useState(hoje);
  const [erro, setErro] = useState<string | undefined>(undefined);
  const [enviada, setEnviada] = useState<string | null>(null);
  const idCampo = useId();

  const recusa = mensagemDoCampo(erroDaApi, 'dataSaida');
  const recusaDaData = recusa !== undefined && enviada === saida ? recusa : undefined;
  const redeAoEnviar = erroDaApi !== null && erroDaApi !== undefined && recusa === undefined;
  useEffect(() => {
    if (recusaDaData) document.getElementById(idCampo)?.focus();
  }, [recusaDaData, idCampo]);

  const confirmar = () => {
    const analise = inativarCorpo(hoje).safeParse({ dataSaida: saida });
    const erros = deValidacao(analise);
    if (!analise.success || saida === '') {
      setErro(erros.dataSaida ?? 'Informe a data de saída.');
      return;
    }
    setErro(undefined);
    setEnviada(saida);
    aoInativar(saida);
  };

  return (
    <Dialogo
      titulo={`Inativar ${apelido}`}
      descricao="Ele sai do ranking, do lançamento, do simulador e do financeiro a partir da data de saída. O histórico e os pontos ficam guardados."
      aoFechar={aoCancelar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao carregando={enviando} onClick={confirmar}>
            Inativar
          </Botao>
        </>
      }
    >
      <CampoData
        rotulo="Data de saída"
        id={idCampo}
        valor={saida}
        aoMudar={setSaida}
        max={hoje}
        erro={erro ?? recusaDaData}
        erroComoAlerta
      />
      {redeAoEnviar ? <p role="alert">Não foi possível inativar. Verifique a conexão e tente de novo.</p> : null}
    </Dialogo>
  );
}
