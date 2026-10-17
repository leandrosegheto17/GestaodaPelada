import type { MesFinanceiro } from '@pelada/contrato';
import { useState } from 'react';
import { textosConfirmacao } from '../../componentes/dialogos-padrao';
import { ErroApi } from '../../dados/erros';
import { useDesmarcarPagamento, useMarcarPagamento } from '../../dados/financeiro';
import { mesNumerico } from '../../formatacao';

type Pagamento = MesFinanceiro['pagamentos'][number];

/**
 * Valor da entrada vinculada do jogador (a mensalidade pode ter mudado depois); sem ela, o da configuração.
 */
function valorDaEntrada(dados: MesFinanceiro, apelido: string): number | null {
  const descricao = `Mensalidade ${apelido} ${mesNumerico(dados.mes)}`;
  const entrada = dados.lancamentos.find((l) => l.mensalidade && l.descricao === descricao);
  return entrada?.valorCentavos ?? dados.config?.mensalidadeCentavos ?? null;
}

/**
 * Estado de marcar e desmarcar pagamentos: o interruptor responde na hora, a API decide (saldos vêm dela) e,
 * se falhar, ele volta ao que era e uma faixa explica. Um pedido por jogador por vez.
 */
export function usarPagamentos(grupoId: string, dados: MesFinanceiro) {
  const marcar = useMarcarPagamento(grupoId);
  const desmarcar = useDesmarcarPagamento(grupoId);
  const [otimista, setOtimista] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [pendente, setPendente] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mudar = (jogadorId: string, pagou: boolean | null) =>
    setOtimista((atual) => {
      const novo = new Map(atual);
      if (pagou === null) novo.delete(jogadorId);
      else novo.set(jogadorId, pagou);
      return novo;
    });

  async function gravar(pagamento: Pagamento, pagou: boolean) {
    const corpo = { jogadorId: pagamento.jogadorId, mes: dados.mes };
    setErro(null);
    mudar(pagamento.jogadorId, pagou);
    try {
      await (pagou ? marcar.mutateAsync(corpo) : desmarcar.mutateAsync(corpo));
    } catch (e) {
      // Já marcado por outro admin: a consulta refeita mostra o estado real, sem alarde.
      if (!(e instanceof ErroApi && e.status === 409)) {
        setErro(
          `Não foi possível ${pagou ? 'marcar' : 'desmarcar'} o pagamento de ${pagamento.apelido}. Tente de novo.`,
        );
      }
    } finally {
      mudar(pagamento.jogadorId, null);
      setPendente(null);
    }
  }

  const valorPendente = pendente ? valorDaEntrada(dados, pendente.apelido) : null;
  return {
    pagamentos: dados.pagamentos.map((p) => ({ ...p, pagou: otimista.get(p.jogadorId) ?? p.pagou })),
    ocupados: new Set(otimista.keys()),
    erro,
    fecharErro: () => setErro(null),
    pedirMudanca(pagamento: Pagamento, pagou: boolean) {
      if (pagou) return void gravar(pagamento, true);
      // Sem mensalidade não há entrada vinculada: nada a perder, desmarca direto.
      if (valorDaEntrada(dados, pagamento.apelido) === null) return void gravar(pagamento, false);
      setErro(null);
      setPendente(pagamento);
    },
    confirmacao:
      pendente && valorPendente !== null
        ? {
            texto: textosConfirmacao.desmarcarPagamento(pendente.apelido, dados.mes, valorPendente),
            carregando: otimista.has(pendente.jogadorId),
            confirmar: () => void gravar(pendente, false),
            cancelar: () => setPendente(null),
          }
        : null,
  };
}
