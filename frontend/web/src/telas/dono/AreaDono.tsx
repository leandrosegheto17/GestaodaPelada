import { useState } from 'react';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Faixa } from '../../componentes/basicos/Faixa';
import { DialogoSenha } from '../../componentes/dialogos-padrao';
import { usePainelDono, useResolverPedido } from '../../dados/dono/painel';
import { useRedefinirSenhaConta } from '../../dados/dono/senha';
import { GruposDono } from './GruposDono';
import { caminhoNovoGrupo } from './navegacao';
import { PedidosSenha } from './PedidosSenha';
import estilos from './dono.module.css';

/** T26: pedidos de senha e grupos da plataforma. O dono não vê dados internos dos grupos. */
export function Component() {
  const painel = usePainelDono();
  const resolver = useResolverPedido();
  const redefinir = useRedefinirSenhaConta();
  const [senha, setSenha] = useState<{ nome: string; senha: string } | null>(null);
  const [falha, setFalha] = useState(false);

  if (painel.isError) {
    return (
      <>
        <h1 className="sr">Área do dono</h1>
        <ErroRede aoTentar={() => void painel.refetch()} />
      </>
    );
  }
  if (!painel.data) {
    return (
      <div aria-busy="true">
        <h1 className="sr">Área do dono</h1>
        <Esqueleto variante="bloco" quantidade={4} />
      </div>
    );
  }

  const { pedidosReset, grupos } = painel.data;
  return (
    <>
      <title>Área do dono</title>
      <h1 className="sr">Área do dono</h1>
      {falha ? (
        <div className={estilos.faixa}>
          <Faixa tipo="erro">Não foi possível concluir. Verifique a conexão e tente de novo.</Faixa>
        </div>
      ) : null}
      <PedidosSenha
        pedidos={pedidosReset}
        ocupada={resolver.isPending ? (resolver.variables ?? null) : null}
        aoRedefinir={(pedido) => {
          setFalha(false);
          redefinir.mutate(pedido.contaId, {
            onSuccess: (r) => setSenha({ nome: r.nome, senha: r.senhaTemporaria }),
            onError: () => setFalha(true),
          });
        }}
        aoResolver={(pedido) => {
          setFalha(false);
          resolver.mutate(pedido.contaId, { onError: () => setFalha(true) });
        }}
      />
      <GruposDono grupos={grupos} />
      {grupos.length > 0 ? (
        <BarraAcao>
          <BotaoLink to={caminhoNovoGrupo}>Novo grupo</BotaoLink>
        </BarraAcao>
      ) : null}
      {senha ? (
        <DialogoSenha
          nome={senha.nome}
          senha={senha.senha}
          aoFechar={() => {
            setSenha(null);
            redefinir.reset();
          }}
        />
      ) : null}
    </>
  );
}
