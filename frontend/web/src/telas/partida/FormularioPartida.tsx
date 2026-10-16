import type { PartidaNova } from '@pelada/contrato';
import { useEffect, useState, type ReactNode } from 'react';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Faixa } from '../../componentes/basicos/Faixa';
import { ContagemFixa } from '../../componentes/seletor-situacao/ContagemFixa';
import { contarSituacoes } from '../../componentes/seletor-situacao/contagem';
import { LinhaJogador, ListaSituacao } from '../../componentes/seletor-situacao/LinhaJogador';
import { CabecalhoDaPartida } from './CabecalhoDaPartida';
import { EsqueletoPartida } from './EsqueletoPartida';
import { FerramentasLista } from './FerramentasLista';
import { filtrarJogadores, iniciarMarcacoes, listaParaEnvio, marcarTodos, type Marcacoes } from './marcacoes';
import estilos from './partida.module.css';

export interface EnvioPartida {
  data: string;
  choveu: boolean;
  marcacoes: ReturnType<typeof listaParaEnvio>;
}

interface Props {
  /** Valor do campo de data (a pedida; vazio antes da primeira resposta). */
  data: string;
  /** "Hoje" da API: maior data que o campo aceita. */
  max: string | undefined;
  aoMudarData: (data: string) => void;
  /** Resposta da API para a data; `undefined` enquanto carrega. */
  resposta: PartidaNova | undefined;
  carregando: boolean;
  erroData?: string | undefined;
  dataExistente?: string | undefined;
  rotaEditar: (data: string) => string;
  /** Faixa antes da lista (ex.: pré-marcação pela escalação). */
  aviso?: ReactNode;
  enviando: boolean;
  /** O último envio falhou (rede ou servidor): mostra a faixa com "Tentar de novo". */
  falhouAoSalvar: boolean;
  aoSalvar: (envio: EnvioPartida) => void;
}

/** Formulário de lançar partida: cabeçalho, contagem, ferramentas, lista e botão de salvar. */
export function FormularioPartida({
  data,
  max,
  aoMudarData,
  resposta,
  carregando,
  erroData,
  dataExistente,
  rotaEditar,
  aviso,
  enviando,
  falhouAoSalvar,
  aoSalvar,
}: Props) {
  const [choveu, setChoveu] = useState(false);
  const [marcacoes, setMarcacoes] = useState<Marcacoes>({});
  const [busca, setBusca] = useState('');

  // Nova resposta (primeira carga ou troca de data): recomeça das marcações que a API mandou.
  useEffect(() => {
    if (!resposta) return;
    setChoveu(resposta.choveu);
    setMarcacoes(iniciarMarcacoes(resposta.jogadores));
    setBusca('');
  }, [resposta]);

  const jogadores = resposta?.jogadores ?? [];
  const comLista = Boolean(resposta) && !erroData && !dataExistente && jogadores.length > 0;
  const semAtivos = Boolean(resposta) && !erroData && !dataExistente && jogadores.length === 0;
  const contagem = contarSituacoes(Object.values(marcacoes));
  const rotuloSalvar = comLista
    ? `Salvar partida (${contagem.presente} ${contagem.presente === 1 ? 'presente' : 'presentes'})`
    : 'Salvar partida';

  const enviar = () => {
    if (!comLista || !resposta) return;
    aoSalvar({ data: resposta.data, choveu, marcacoes: listaParaEnvio(jogadores, marcacoes) });
  };
  const visiveis = filtrarJogadores(jogadores, busca);

  return (
    <>
      {falhouAoSalvar ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={enviar}>
              Tentar de novo
            </Botao>
          }
        >
          Não salvou. Suas marcações continuam aqui.
        </Faixa>
      ) : null}
      <form
        noValidate
        aria-busy={enviando || undefined}
        onSubmit={(evento) => {
          evento.preventDefault();
          enviar();
        }}
      >
        <CabecalhoDaPartida
          data={data}
          max={max}
          aoMudarData={aoMudarData}
          choveu={choveu}
          aoMudarChoveu={setChoveu}
          erroData={erroData}
          dataExistente={dataExistente}
          rotaEditar={rotaEditar}
        />
        {carregando ? <EsqueletoPartida data={data || undefined} /> : null}
        {comLista ? (
          <>
            {aviso ? <div className={estilos.acima3}>{aviso}</div> : null}
            <ContagemFixa contagem={contagem} />
            <FerramentasLista
              busca={busca}
              aoBuscar={setBusca}
              aoMarcarTodos={() => setMarcacoes((atual) => marcarTodos(atual, 'presente'))}
              aoLimpar={() => setMarcacoes((atual) => marcarTodos(atual, 'ausente'))}
            />
            {visiveis.length > 0 ? (
              <ListaSituacao duasColunas>
                {visiveis.map((jogador) => (
                  <LinhaJogador
                    key={jogador.id}
                    jogador={jogador}
                    valor={marcacoes[jogador.id] ?? jogador.situacao}
                    aoMudar={(situacao) => setMarcacoes((atual) => ({ ...atual, [jogador.id]: situacao }))}
                  />
                ))}
              </ListaSituacao>
            ) : (
              <p className={estilos.semResultado}>Nenhum jogador encontrado.</p>
            )}
          </>
        ) : null}
        {semAtivos ? (
          <div className={estilos.acima4}>
            <EstadoVazio
              titulo="Ninguém estava ativo nessa data."
              texto="Escolha outra data ou confira as datas de entrada dos jogadores."
            />
          </div>
        ) : null}
        <BarraAcao>
          <Botao type="submit" disabled={!comLista} carregando={enviando}>
            {rotuloSalvar}
          </Botao>
        </BarraAcao>
      </form>
    </>
  );
}
