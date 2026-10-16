import type { SessaoEu } from '@pelada/contrato';
import { useNavigate } from 'react-router';
import { recursos } from '../../config/recursos';
import { useSair } from '../../dados/sessao';
import { Faixa } from '../basicos/Faixa';
import { Folha, ListaFolha } from '../dialogos/Folha';
import { OpcaoFolha } from '../dialogos/OpcaoFolha';

interface Props {
  conta: SessaoEu['conta'];
  aoFechar: () => void;
}

/** Folha do menu da conta. Esconder opções é conveniência; a API é quem autoriza. */
export function MenuConta({ conta, aoFechar }: Props) {
  const navegar = useNavigate();
  const sair = useSair();
  const aoSair = () => {
    if (sair.isPending) return;
    sair.mutate(undefined, { onSuccess: () => navegar('/', { replace: true }) });
  };
  return (
    <Folha titulo={conta.nome} aoFechar={aoFechar}>
      {sair.isError ? <Faixa tipo="erro">Não foi possível sair. Tente de novo.</Faixa> : null}
      <ListaFolha>
        <OpcaoFolha para="/conta/senha">Minha senha</OpcaoFolha>
        {recursos.ligado('privacidade') ? <OpcaoFolha para="/privacidade">Privacidade</OpcaoFolha> : null}
        {conta.eDono ? <OpcaoFolha para="/dono">Área do dono</OpcaoFolha> : null}
        <OpcaoFolha aoEscolher={aoSair}>Sair</OpcaoFolha>
      </ListaFolha>
    </Folha>
  );
}
