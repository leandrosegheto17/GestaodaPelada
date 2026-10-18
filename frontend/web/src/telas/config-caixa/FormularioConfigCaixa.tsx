import { configFinanceiraCorpo, LIMITES, type ConfigFinanceiraCorpo } from '@pelada/contrato';
import { useState } from 'react';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { CampoData } from '../../componentes/campos/CampoData';
import { CampoMoeda } from '../../componentes/campos/CampoMoeda';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { DuasColunas } from '../../componentes/pagina/DuasColunas';
import { Formulario } from '../../componentes/pagina/Formulario';
import { deValidacao, type ErrosDeCampos } from '../../dados/errosDeCampos';

interface Props {
  /** Configuração atual; `null` = caixa ainda não configurado. */
  atual: ConfigFinanceiraCorpo | null;
  /** "Hoje" da API: a data padrão do saldo inicial. */
  hoje: string;
  /** Erros que vieram do servidor (422 `campos`), por campo. */
  errosDoServidor: ErrosDeCampos;
  enviando: boolean;
  semConexao: boolean;
  aoSalvar: (corpo: ConfigFinanceiraCorpo) => void;
}

const CAMPOS: { id: string; chave: string; rotulo: string }[] = [
  { id: 'mens', chave: 'mensalidadeCentavos', rotulo: 'Mensalidade' },
  { id: 'saldo', chave: 'saldoInicialCentavos', rotulo: 'Saldo inicial (R$)' },
  { id: 'data-saldo', chave: 'dataSaldoInicial', rotulo: 'Data do saldo inicial' },
];

/** O que está escrito no campo agora (os campos de valor só entregam o número ao sair deles). */
const textoDoCampo = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';

/** Configuração do caixa: mensalidade (opcional), saldo inicial e a data dele. */
export function FormularioConfigCaixa({ atual, hoje, errosDoServidor, enviando, semConexao, aoSalvar }: Props) {
  const [mensalidade, setMensalidade] = useState<number | null>(atual?.mensalidadeCentavos ?? null);
  const [saldo, setSaldo] = useState<number | null>(atual?.saldoInicialCentavos ?? null);
  const [data, setData] = useState(atual?.dataSaldoInicial ?? hoje);
  const [errosLocais, setErrosLocais] = useState<ErrosDeCampos>({});
  // Valor digitado e recusado: o próprio campo já explicou o motivo ao sair dele.
  const [recusados, setRecusados] = useState<ReadonlySet<string>>(new Set());

  const erros = { ...errosDoServidor, ...errosLocais };
  const itens = CAMPOS.filter((c) => erros[c.chave] || recusados.has(c.chave)).map((c) => ({
    idCampo: c.id,
    rotulo: c.rotulo,
  }));
  const umSoErro = itens.length === 1;

  const salvar = () => {
    const analise = configFinanceiraCorpo.safeParse({
      mensalidadeCentavos: mensalidade,
      saldoInicialCentavos: saldo ?? 0,
      dataSaldoInicial: data,
    });
    const invalidos = deValidacao(analise);
    delete invalidos.saldoInicialCentavos;
    const recusadosAgora = new Set<string>();
    if (mensalidade === null && textoDoCampo('mens') !== '') recusadosAgora.add('mensalidadeCentavos');
    if (saldo === null) {
      if (textoDoCampo('saldo') === '') invalidos.saldoInicialCentavos = 'Informe o saldo inicial.';
      else recusadosAgora.add('saldoInicialCentavos');
    }
    setRecusados(recusadosAgora);
    setErrosLocais(invalidos);
    if (Object.keys(invalidos).length > 0 || recusadosAgora.size > 0 || !analise.success) return;
    aoSalvar(analise.data);
  };

  return (
    <Formulario aoEnviar={salvar} enviando={enviando}>
      <ResumoErros erros={itens} />
      <CampoMoeda
        id="mens"
        rotulo="Mensalidade (opcional, R$)"
        ajuda="Com mensalidade, marcar “pagou” já cria a entrada no caixa."
        centavos={mensalidade}
        aoMudar={setMensalidade}
        faixa={LIMITES.valorCentavos}
        opcional
        erro={erros.mensalidadeCentavos}
        erroComoAlerta={umSoErro}
      />
      <DuasColunas>
        <CampoMoeda
          id="saldo"
          rotulo="Saldo inicial (R$)"
          centavos={saldo}
          aoMudar={setSaldo}
          faixa={LIMITES.saldoInicialCentavos}
          erro={erros.saldoInicialCentavos}
          erroComoAlerta={umSoErro}
        />
        <CampoData
          id="data-saldo"
          rotulo="Data do saldo inicial"
          valor={data}
          aoMudar={setData}
          erro={erros.dataSaldoInicial}
          erroComoAlerta={umSoErro}
        />
      </DuasColunas>
      {semConexao ? <ErroEnvio /> : null}
      <BarraAcao>
        <Botao type="submit" variante="principal" carregando={enviando}>
          Salvar
        </Botao>
      </BarraAcao>
    </Formulario>
  );
}
