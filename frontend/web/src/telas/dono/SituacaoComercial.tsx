import { situacaoComercialCorpo, type GrupoDono } from '@pelada/contrato';
import { useId, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CampoData } from '../../componentes/campos/CampoData';
import { CampoSeletor } from '../../componentes/campos/CampoSeletor';
import { Formulario } from '../../componentes/pagina/Formulario';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ORDEM_SITUACAO_COMERCIAL, ROTULO_SITUACAO_COMERCIAL } from '../../rotulos';
import estilos from './dono.module.css';

const OPCOES = ORDEM_SITUACAO_COMERCIAL.map((s) => ({ valor: s, rotulo: ROTULO_SITUACAO_COMERCIAL[s] }));

interface Props {
  grupo: GrupoDono;
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: { situacaoComercial: string; inicioTrial: string | null }) => void;
}

/** Situação comercial do grupo. Só o trial tem data de início (não vem do relógio do aparelho). */
export function SituacaoComercial({ grupo, errosDoServidor, enviando, semConexao, aoSalvar }: Props) {
  const idTitulo = useId();
  const [situacao, setSituacao] = useState<string>(grupo.situacaoComercial);
  const [inicio, setInicio] = useState(grupo.inicioTrial ?? '');
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  const erros = { ...errosDoServidor, ...errosLocais };

  const salvar = () => {
    const corpo = { situacaoComercial: situacao, inicioTrial: situacao === 'trial' ? inicio || null : null };
    const analise = situacaoComercialCorpo.safeParse(corpo);
    if (!analise.success) {
      setErrosLocais(deValidacao(analise));
      return;
    }
    setErrosLocais({});
    aoSalvar(corpo);
  };

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.subtitulo}>
        Situação comercial
      </h2>
      <Formulario aoEnviar={salvar} enviando={enviando}>
        <CampoSeletor
          rotulo="Situação comercial"
          rotuloOculto
          ajuda="Não muda nada no app nesta fase."
          valor={situacao}
          aoMudar={setSituacao}
          opcoes={OPCOES}
        />
        {situacao === 'trial' ? (
          <CampoData
            rotulo="Início do trial"
            valor={inicio}
            aoMudar={setInicio}
            erro={erros.inicioTrial}
            erroComoAlerta
          />
        ) : null}
        {semConexao ? <ErroEnvio /> : null}
        <div>
          <Botao type="submit" variante="secundario" carregando={enviando}>
            Salvar situação
          </Botao>
        </div>
      </Formulario>
    </section>
  );
}
