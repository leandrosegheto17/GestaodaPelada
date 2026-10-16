import { editarGrupoCorpo, type GrupoDetalhe } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CampoHora } from '../../componentes/campos/CampoHora';
import { CampoSeletor } from '../../componentes/campos/CampoSeletor';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { Segmentado } from '../../componentes/escolhas/Segmentado';
import type { CorpoGrupo } from '../../dados/grupo';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ORDEM_DIA_SEMANA, ORDEM_FREQUENCIA, ROTULO_DIA_SEMANA, ROTULO_FREQUENCIA } from '../../rotulos';
import estilos from './grupo.module.css';

type Dados = GrupoDetalhe['grupo'];

interface Props {
  grupo: Dados;
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: CorpoGrupo) => void;
}

const DIAS = ORDEM_DIA_SEMANA.map((d) => ({ valor: d, rotulo: ROTULO_DIA_SEMANA[d] }));
const FREQUENCIAS = ORDEM_FREQUENCIA.map((f) => ({ valor: f, rotulo: ROTULO_FREQUENCIA[f] }));

/** Nome, dia, horário e frequência. Os quatro campos sempre vão juntos; o link nunca é editável. */
export function FormularioGrupo({ grupo, errosDoServidor, enviando, semConexao, aoSalvar }: Props) {
  const [nome, setNome] = useState(grupo.nome);
  const [dia, setDia] = useState<string>(grupo.diaSemana);
  const [frequencia, setFrequencia] = useState<string>(grupo.frequencia);
  const [horario, setHorario] = useState(grupo.horario);
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  const erros = { ...errosDoServidor, ...errosLocais };
  const itens = [
    ...(erros.nome ? [{ idCampo: 'grupo-nome', rotulo: 'Nome' }] : []),
    ...(erros.horario ? [{ idCampo: 'grupo-horario', rotulo: 'Horário' }] : []),
  ];

  const salvar = () => {
    const analise = editarGrupoCorpo.safeParse({ nome, diaSemana: dia, frequencia, horario });
    if (!analise.success) {
      setErrosLocais(deValidacao(analise));
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
      <CampoTexto
        id="grupo-nome"
        rotulo="Nome"
        ajuda="Mudar o nome não muda o link do ranking."
        maxLength={60}
        erro={erros.nome}
        erroComoAlerta={itens.length === 1}
        valor={nome}
        aoMudar={setNome}
      />
      <div className={estilos.duasColunas}>
        <CampoSeletor rotulo="Dia da semana" valor={dia} aoMudar={setDia} opcoes={DIAS} />
        <CampoHora
          id="grupo-horario"
          rotulo="Horário"
          valor={horario}
          aoMudar={setHorario}
          erro={erros.horario}
          erroComoAlerta={itens.length === 1}
        />
      </div>
      <Segmentado legenda="Frequência" legendaVisivel valor={frequencia} aoMudar={setFrequencia} opcoes={FREQUENCIAS} />
      {semConexao ? <ErroEnvio /> : null}
      <div>
        <Botao type="submit" carregando={enviando}>
          Salvar
        </Botao>
      </div>
    </form>
  );
}
