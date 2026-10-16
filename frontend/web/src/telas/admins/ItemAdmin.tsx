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
  return (
    <Item
      quebra
      titulo={admin.voce ? `${admin.nome} (você)` : admin.nome}
      meta={admin.email}
      acoes={
        <div className={estilos.grupoBotoes}>
          <Interruptor
            rotuloAcessivel={`Acessa financeiro: ${admin.nome}`}
            marcado={acessaFinanceiro}
            aoMudar={aoMudarFinanceiro}
            textoLigado="Financeiro"
            textoDesligado="Financeiro"
            desabilitado={!podeGerirFinanceiro}
          />
          {admin.voce ? (
            <BotaoLink to="/conta/senha" variante="texto">
              Minha senha
            </BotaoLink>
          ) : (
            <>
              <Botao variante="secundario" onClick={aoRedefinirSenha}>
                Redefinir senha
              </Botao>
              <Botao variante="textoDestrutivo" onClick={aoRemover}>
                Remover do grupo
              </Botao>
            </>
          )}
        </div>
      }
    />
  );
}
