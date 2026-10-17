import type { ListaAdmins } from '@pelada/contrato';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { Interruptor } from '../../componentes/escolhas/Interruptor';
import { Item } from '../../componentes/listas/Item';
import estilos from './admins.module.css';

type Admin = ListaAdmins['admins'][number];

interface Props {
  admin: Admin;
  /** Vem da API: só quem tem o financeiro concede ou retira. */
  podeGerirFinanceiro: boolean;
  /** Valor mostrado no interruptor (já com a mudança pendente, se houver). */
  acessaFinanceiro: boolean;
  aoMudarFinanceiro: (marcado: boolean) => void;
  aoRedefinirSenha: () => void;
  aoRemover: () => void;
}

/** Linha de admin. A própria linha só tem "Minha senha"; as outras, redefinir senha e remover. */
export function ItemAdmin({
  admin,
  podeGerirFinanceiro,
  acessaFinanceiro,
  aoMudarFinanceiro,
  aoRedefinirSenha,
  aoRemover,
}: Props) {
  const idAjuda = `ajuda-proprio-acesso-${admin.contaId}`;
  return (
    <Item
      quebra
      titulo={admin.voce ? `${admin.nome} (você)` : admin.nome}
      meta={admin.email}
      acoes={
        <>
          <Interruptor
            rotuloAcessivel={`Acessa financeiro: ${admin.nome}`}
            marcado={acessaFinanceiro}
            aoMudar={aoMudarFinanceiro}
            textoLigado="Financeiro"
            textoDesligado="Financeiro"
            desabilitado={!podeGerirFinanceiro || admin.voce}
            descritoPor={admin.voce ? idAjuda : undefined}
          />
          {admin.voce ? (
            <BotaoLink to="/conta/senha" variante="texto">
              Minha senha
            </BotaoLink>
          ) : (
            <span className={estilos.grupoBotoes}>
              <Botao variante="texto" onClick={aoRedefinirSenha}>
                Redefinir senha
              </Botao>
              <Botao variante="textoDestrutivo" onClick={aoRemover}>
                Remover do grupo
              </Botao>
            </span>
          )}
          {admin.voce ? (
            <p className={estilos.ajudaLinha} id={idAjuda}>
              Você não pode alterar o seu próprio acesso.
            </p>
          ) : null}
        </>
      }
    />
  );
}
