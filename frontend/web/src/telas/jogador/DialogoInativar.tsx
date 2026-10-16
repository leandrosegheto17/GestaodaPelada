import { inativarCorpo } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { CampoData } from '../../componentes/campos/CampoData';
import { Dialogo } from '../../componentes/dialogos/Dialogo';
import { deValidacao } from '../../dados/errosDeCampos';

interface Props {
  apelido: string;
  /** "Hoje" da API: data de saída padrão e maior data aceita. */
  hoje: string;
  enviando: boolean;
  falhou: boolean;
  aoInativar: (dataSaida: string) => void;
  aoCancelar: () => void;
}

/** Inativar com data de saída (não destrutivo: Esc fecha). A data futura é recusada como no contrato. */
export function DialogoInativar({ apelido, hoje, enviando, falhou, aoInativar, aoCancelar }: Props) {
  const [saida, setSaida] = useState(hoje);
  const [erro, setErro] = useState<string | undefined>(undefined);

  const confirmar = () => {
    const analise = inativarCorpo(hoje).safeParse({ dataSaida: saida });
    const erros = deValidacao(analise);
    if (!analise.success || saida === '') {
      setErro(erros.dataSaida ?? 'Informe a data de saída.');
      return;
    }
    setErro(undefined);
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
      <CampoData rotulo="Data de saída" valor={saida} aoMudar={setSaida} max={hoje} erro={erro} erroComoAlerta />
      {falhou ? <p role="alert">Não foi possível inativar. Verifique a conexão e tente de novo.</p> : null}
    </Dialogo>
  );
}
