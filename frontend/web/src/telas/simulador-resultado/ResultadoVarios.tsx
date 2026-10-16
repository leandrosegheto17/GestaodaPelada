import type { EntradaSimulador, SugestaoVarios } from '@pelada/contrato';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  destinoAtual,
  MoverJogador,
  paraCorpoEscalacao,
  TrocarCom,
  useAjusteSimulador,
} from '../../componentes/ajuste-simulador';
import { Botao } from '../../componentes/basicos/Botao';
import { Faixa } from '../../componentes/basicos/Faixa';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CartaoTime, ListaAvisos } from '../../componentes/cartao-time';
import { DialogoConfirmacao, textosConfirmacao } from '../../componentes/dialogos-padrao';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { estadoRetorno } from '../../dados/retorno';
import { useConfirmarEscalacao } from '../../dados/simulador';
import { BarraResultado } from './BarraResultado';
import { gruposParaTrocar } from './gruposParaTrocar';
import { LinhaContexto } from './LinhaContexto';
import { MENSAGEM_FALHA_CONFIRMAR } from './ResultadoDois';
import estilos from './resultado.module.css';

interface Props {
  grupoId: string;
  entrada: Extract<EntradaSimulador, { formato: 'varios_times' }>;
  sugestao: SugestaoVarios;
  aoRefazer: () => void;
}

/** T14: sugestão para 3 ou mais times (sem tempos), com ajuste manual, confirmação e refazer. */
export function ResultadoVarios({ grupoId, entrada, sugestao, aoRefazer }: Props) {
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const navegar = useNavigate();
  const ajuste = useAjusteSimulador({ grupoId, entrada, sugestao });
  const confirmar = useConfirmarEscalacao(grupoId);
  const [alvo, setAlvo] = useState<{ id: string; modo: 'mover' | 'trocar' } | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [falhouAoConfirmar, setFalhouAoConfirmar] = useState(false);

  const exibicao = ajuste.exibicao;
  if (exibicao.formato !== 'varios_times') return null;
  const composicao = ajuste.composicao;

  const aoConfirmar = () => {
    const corpo = paraCorpoEscalacao(entrada, composicao);
    if (!corpo) {
      setFalhouAoConfirmar(true);
      return;
    }
    setFalhouAoConfirmar(false);
    confirmar.mutate(corpo, {
      onSuccess: () =>
        void navegar(base, { state: estadoRetorno({ tipo: 'escalacao-confirmada', data: entrada.data }) }),
      onError: () => setFalhouAoConfirmar(true),
    });
  };

  const jogadorDoAlvo = alvo ? exibicao.times.flatMap((t) => t.jogadores).find((j) => j.id === alvo.id) : undefined;
  const atual = alvo ? destinoAtual(composicao, alvo.id) : null;

  return (
    <div>
      <title>Times sugeridos</title>
      <Voltar para={`${base}/simulador`} rotulo="Simulador" />
      <TituloPagina>Times sugeridos</TituloPagina>
      <LinhaContexto
        entrada={entrada}
        times={exibicao.times.map((t) => ({ incompleto: t.incompleto, tamanho: t.jogadores.length }))}
      />
      {ajuste.erroRecalculo ? (
        <div className={estilos.faixa}>
          <Faixa
            tipo="erro"
            acao={
              <Botao variante="texto" onClick={ajuste.tentarDeNovo}>
                Tentar de novo
              </Botao>
            }
          >
            {ajuste.erroRecalculo}
          </Faixa>
        </div>
      ) : null}
      {falhouAoConfirmar ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">{MENSAGEM_FALHA_CONFIRMAR}</Faixa>
        </div>
      ) : null}
      <ListaAvisos avisos={exibicao.avisos} />
      <div className={`${estilos.times} ${estilos.timesVarios}`}>
        {exibicao.times.map((time) => (
          <CartaoTime
            key={time.nome}
            formato="varios_times"
            time={time}
            n={entrada.n}
            movidos={ajuste.movidos}
            recalculando={ajuste.recalculando}
            aoTocar={(id) => setAlvo({ id, modo: 'mover' })}
          />
        ))}
      </div>
      <BarraResultado
        confirmarDesabilitado={!ajuste.podeConfirmar}
        confirmando={confirmar.isPending}
        aoConfirmar={aoConfirmar}
        aoRefazer={() => (ajuste.houveAjuste ? setDescartando(true) : aoRefazer())}
        destinoEditar={`${base}/simulador`}
        entrada={entrada}
      />
      {alvo && jogadorDoAlvo && atual && !('lugar' in atual) && alvo.modo === 'mover' ? (
        <MoverJogador
          formato="varios_times"
          apelido={jogadorDoAlvo.apelido}
          nomesDosTimes={exibicao.times.map((t) => t.nome)}
          atual={atual}
          aoEscolher={(destino) => ajuste.mover(alvo.id, destino)}
          aoTrocar={() => setAlvo({ id: alvo.id, modo: 'trocar' })}
          aoFechar={() => setAlvo(null)}
        />
      ) : null}
      {alvo && jogadorDoAlvo && alvo.modo === 'trocar' ? (
        <TrocarCom
          apelido={jogadorDoAlvo.apelido}
          grupos={gruposParaTrocar(exibicao, alvo.id)}
          aoEscolher={(outro) => ajuste.trocar(alvo.id, outro)}
          aoVoltar={() => setAlvo({ id: alvo.id, modo: 'mover' })}
          aoFechar={() => setAlvo(null)}
        />
      ) : null}
      {descartando ? (
        <DialogoConfirmacao
          {...textosConfirmacao.refazerSugestao()}
          aoConfirmar={() => {
            setDescartando(false);
            aoRefazer();
          }}
          aoCancelar={() => setDescartando(false)}
        />
      ) : null}
    </div>
  );
}
