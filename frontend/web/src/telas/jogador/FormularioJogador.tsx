import { jogadorCorpo, type JogadorDetalhe } from '@pelada/contrato';
import { useState } from 'react';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Campo } from '../../componentes/campos/Campo';
import { CampoData } from '../../componentes/campos/CampoData';
import { CampoSeletor } from '../../componentes/campos/CampoSeletor';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { DuasColunas } from '../../componentes/pagina/DuasColunas';
import { Formulario } from '../../componentes/pagina/Formulario';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import type { CorpoJogador } from '../../dados/elenco';
import { digitosDoTelefone, formatarTelefone, mascararTelefone } from '../../formatacao/telefone';
import { ORDEM_POSICAO, rotuloPosicao } from '../../rotulos';

interface Props {
  /** Dados atuais (edição); `undefined` = novo jogador. */
  jogador: JogadorDetalhe | undefined;
  /** "Hoje" da API, para as regras do contrato (ano máximo, data de entrada). */
  hoje: string;
  /** Erros que vieram do servidor (422 `campos`), por campo. */
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: CorpoJogador) => void;
}

const CAMPOS: { id: string; chave: string; rotulo: string }[] = [
  { id: 'apelido', chave: 'apelido', rotulo: 'Apelido' },
  { id: 'ano', chave: 'anoNascimento', rotulo: 'Ano de nascimento' },
  { id: 'pos', chave: 'posicao', rotulo: 'Posição' },
  { id: 'tel', chave: 'telefone', rotulo: 'Telefone' },
  { id: 'entrada', chave: 'dataEntrada', rotulo: 'Data de entrada' },
];

const OPCOES_POSICAO = [
  { valor: '', rotulo: 'Escolha' },
  ...ORDEM_POSICAO.map((p) => ({ valor: p, rotulo: rotuloPosicao(p) })),
];

/** Dados do jogador: o mesmo formulário serve ao cadastro e à edição. Valida com as regras do contrato. */
export function FormularioJogador({ jogador, hoje, errosDoServidor, enviando, semConexao, aoSalvar }: Props) {
  const [apelido, setApelido] = useState(jogador?.apelido ?? '');
  const [ano, setAno] = useState(jogador ? String(jogador.anoNascimento) : '');
  const [posicao, setPosicao] = useState<string>(jogador?.posicao ?? '');
  const [telefone, setTelefone] = useState(jogador?.telefone ? formatarTelefone(jogador.telefone) : '');
  const [entrada, setEntrada] = useState(jogador?.situacao.desde ?? hoje);
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});

  const erros = { ...errosDoServidor, ...errosLocais };
  const itens = CAMPOS.filter((c) => erros[c.chave]).map((c) => ({ idCampo: c.id, rotulo: c.rotulo }));
  const umSoErro = itens.length === 1;
  const anoMaximo = Number(hoje.slice(0, 4)) - 10;

  const salvar = () => {
    const analise = jogadorCorpo(hoje).safeParse({
      apelido,
      anoNascimento: ano === '' ? 0 : Number(ano),
      posicao: posicao || undefined,
      telefone: digitosDoTelefone(telefone),
      dataEntrada: entrada || undefined,
    });
    const invalidos = deValidacao(analise);
    if (posicao === '') invalidos.posicao = 'Escolha a posição.';
    if (Object.keys(invalidos).length > 0 || !analise.success) {
      setErrosLocais(invalidos);
      return;
    }
    setErrosLocais({});
    aoSalvar({
      apelido: analise.data.apelido,
      anoNascimento: analise.data.anoNascimento,
      posicao: analise.data.posicao,
      telefone: analise.data.telefone,
      dataEntrada: analise.data.dataEntrada,
    });
  };

  return (
    <Formulario aoEnviar={salvar} enviando={enviando}>
      <ResumoErros erros={itens} />
      <CampoTexto
        id="apelido"
        rotulo="Apelido"
        ajuda="De 2 a 30 caracteres. É o nome que aparece no ranking."
        maxLength={30}
        erro={erros.apelido}
        erroComoAlerta={umSoErro}
        valor={apelido}
        aoMudar={setApelido}
      />
      <DuasColunas>
        <Campo id="ano" rotulo="Ano de nascimento" erro={erros.anoNascimento} erroComoAlerta={umSoErro}>
          {(entradaProps) => (
            <input
              {...entradaProps}
              type="number"
              inputMode="numeric"
              min={1940}
              max={anoMaximo}
              value={ano}
              onChange={(e) => setAno(e.target.value)}
            />
          )}
        </Campo>
        <CampoSeletor
          id="pos"
          rotulo="Posição"
          ajuda="Só para cadastro."
          erro={erros.posicao}
          erroComoAlerta={umSoErro}
          valor={posicao}
          aoMudar={setPosicao}
          opcoes={OPCOES_POSICAO}
        />
      </DuasColunas>
      <DuasColunas>
        <Campo id="tel" rotulo="Telefone (opcional)" erro={erros.telefone} erroComoAlerta={umSoErro}>
          {(entradaProps) => (
            <input
              {...entradaProps}
              type="tel"
              inputMode="tel"
              placeholder="(DD) 9XXXX-XXXX"
              value={telefone}
              onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            />
          )}
        </Campo>
        <CampoData
          id="entrada"
          rotulo="Data de entrada"
          valor={entrada}
          aoMudar={setEntrada}
          erro={erros.dataEntrada}
          erroComoAlerta={umSoErro}
        />
      </DuasColunas>
      {semConexao ? <ErroEnvio /> : null}
      {jogador ? (
        <div>
          <Botao type="submit" carregando={enviando}>
            Salvar
          </Botao>
        </div>
      ) : (
        <BarraAcao>
          <Botao type="submit" carregando={enviando}>
            Salvar
          </Botao>
        </BarraAcao>
      )}
    </Formulario>
  );
}
