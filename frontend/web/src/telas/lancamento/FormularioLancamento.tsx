import { LIMITES, lancamentoCorpo, type LancamentoCorpo, type TipoLancamento } from '@pelada/contrato';
import { useState, type ReactNode } from 'react';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CampoData } from '../../componentes/campos/CampoData';
import { CampoMoeda } from '../../componentes/campos/CampoMoeda';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { Segmentado } from '../../componentes/escolhas/Segmentado';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ORDEM_TIPO_LANCAMENTO, rotuloTipoLancamento } from '../../rotulos';
import estilos from './lancamento.module.css';

interface Props {
  /** Dados atuais (edição); `undefined` = lançamento novo. */
  inicial: LancamentoCorpo | undefined;
  /** "Hoje" da API: a data de um lançamento novo. */
  hoje: string;
  /** Erros que vieram do servidor (422 `campos`), por campo. */
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: LancamentoCorpo) => void;
  /** Ações ao lado do "Salvar" (ex.: "Excluir" na edição). */
  acoesExtras?: ReactNode;
}

const CAMPOS: { id: string; chave: string; rotulo: string }[] = [
  { id: 'data', chave: 'data', rotulo: 'Data' },
  { id: 'desc', chave: 'descricao', rotulo: 'Descrição' },
  { id: 'valor', chave: 'valorCentavos', rotulo: 'Valor (R$)' },
];

const OPCOES_TIPO = ORDEM_TIPO_LANCAMENTO.map((t) => ({ valor: t, rotulo: rotuloTipoLancamento(t) }));

/** Dados do lançamento: o mesmo formulário serve ao novo e à edição. Valida com as regras do contrato. */
export function FormularioLancamento({
  inicial,
  hoje,
  errosDoServidor,
  enviando,
  semConexao,
  aoSalvar,
  acoesExtras,
}: Props) {
  const [tipo, setTipo] = useState<TipoLancamento>(inicial?.tipo ?? 'entrada');
  const [data, setData] = useState(inicial?.data ?? hoje);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [centavos, setCentavos] = useState<number | null>(inicial?.valorCentavos ?? null);
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  // Valor digitado e recusado: o próprio campo já explicou o motivo ao sair dele.
  const [valorRecusado, setValorRecusado] = useState(false);

  const erros = { ...errosDoServidor, ...errosLocais };
  const itens = CAMPOS.filter((c) => erros[c.chave] || (c.chave === 'valorCentavos' && valorRecusado)).map((c) => ({
    idCampo: c.id,
    rotulo: c.rotulo,
  }));
  const umSoErro = itens.length === 1;

  const salvar = () => {
    const analise = lancamentoCorpo.safeParse({ tipo, data, descricao, valorCentavos: centavos ?? 0 });
    const invalidos = deValidacao(analise);
    delete invalidos.valorCentavos;
    const vazio = (document.getElementById('valor') as HTMLInputElement | null)?.value.trim() === '';
    if (centavos === null && vazio) invalidos.valorCentavos = 'Informe o valor.';
    setValorRecusado(centavos === null && !vazio);
    if (Object.keys(invalidos).length > 0 || centavos === null || !analise.success) {
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
      <Segmentado legenda="Tipo" opcoes={OPCOES_TIPO} valor={tipo} aoMudar={setTipo} />
      <CampoData id="data" rotulo="Data" valor={data} aoMudar={setData} erro={erros.data} erroComoAlerta={umSoErro} />
      <CampoTexto
        id="desc"
        rotulo="Descrição"
        maxLength={LIMITES.descricaoLancamento.max}
        contador
        erro={erros.descricao}
        erroComoAlerta={umSoErro}
        valor={descricao}
        aoMudar={setDescricao}
      />
      <CampoMoeda
        id="valor"
        rotulo="Valor (R$)"
        centavos={centavos}
        aoMudar={setCentavos}
        faixa={LIMITES.valorCentavos}
        erro={erros.valorCentavos}
        erroComoAlerta={umSoErro}
      />
      {erros.tipo ? <p role="alert">{erros.tipo}</p> : null}
      {semConexao ? <ErroEnvio /> : null}
      {inicial ? (
        <div className={estilos.grupoBotoes}>
          <Botao type="submit" variante="principal" carregando={enviando}>
            Salvar
          </Botao>
          {acoesExtras}
        </div>
      ) : (
        <BarraAcao>
          <Botao type="submit" variante="principal" carregando={enviando}>
            Salvar
          </Botao>
        </BarraAcao>
      )}
    </form>
  );
}
