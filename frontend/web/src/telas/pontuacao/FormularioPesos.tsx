import { novosPesosCorpo, type PainelPesos } from '@pelada/contrato';
import { useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Campo } from '../../componentes/campos/Campo';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import type { CorpoPesos } from '../../dados/pesos';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ORDEM_PESOS, ROTULO_PESO, type ChavePeso } from '../../rotulos/pesos';
import estilos from './pontuacao.module.css';

interface Props {
  vigente: PainelPesos['vigente'];
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: CorpoPesos) => void;
}

/** Os 5 pesos como texto digitado: só vira inteiro na validação pelo contrato. */
export function FormularioPesos({ vigente, errosDoServidor, enviando, semConexao, aoSalvar }: Props) {
  const base = useId();
  const [valores, setValores] = useState<Record<ChavePeso, string>>(
    () => Object.fromEntries(ORDEM_PESOS.map((chave) => [chave, String(vigente[chave])])) as Record<ChavePeso, string>,
  );
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  const erros = { ...errosDoServidor, ...errosLocais };
  const idDe = (chave: ChavePeso) => `${base}-${chave}`;
  const itens = ORDEM_PESOS.filter((c) => erros[c]).map((c) => ({ idCampo: idDe(c), rotulo: ROTULO_PESO[c] }));

  const salvar = () => {
    const candidato = Object.fromEntries(
      ORDEM_PESOS.map((chave) => [
        chave,
        valores[chave].trim() === '' ? Number.NaN : Number(valores[chave].replace(',', '.')),
      ]),
    );
    const analise = novosPesosCorpo.safeParse(candidato);
    if (!analise.success) {
      const invalidos = deValidacao(analise);
      for (const chave of ORDEM_PESOS) {
        if (Number.isNaN(candidato[chave])) invalidos[chave] = 'Use um número inteiro de −10 a 10.';
      }
      setErrosLocais(invalidos);
      return;
    }
    setErrosLocais({});
    aoSalvar(analise.data);
  };

  return (
    <form
      className={estilos.formulario}
      noValidate
      aria-busy={enviando || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      <ResumoErros erros={itens} />
      <div className={estilos.duasColunas}>
        {ORDEM_PESOS.map((chave) => (
          <Campo
            key={chave}
            id={idDe(chave)}
            rotulo={ROTULO_PESO[chave]}
            erro={erros[chave]}
            erroComoAlerta={itens.length === 1}
          >
            {(entrada) => (
              <input
                {...entrada}
                type="number"
                min={-10}
                max={10}
                step={1}
                inputMode="numeric"
                value={valores[chave]}
                onChange={(e) => setValores((atuais) => ({ ...atuais, [chave]: e.target.value }))}
              />
            )}
          </Campo>
        ))}
      </div>
      <p className={estilos.ajuda}>Inteiros de {'−'}10 a 10. Partidas anteriores a hoje não mudam.</p>
      {semConexao ? <ErroEnvio /> : null}
      <div>
        <Botao type="submit" carregando={enviando}>
          Salvar nova configuração
        </Botao>
      </div>
    </form>
  );
}
