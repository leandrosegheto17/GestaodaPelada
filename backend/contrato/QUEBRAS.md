# Quebras de contrato aceitas

Uma mudança que remove ou renomeia campo de resposta, troca tipo, remove valor de enum ou torna
obrigatório um campo de entrada só passa em `pnpm --filter @pelada/contrato checar-compatibilidade`
se estiver listada aqui, com o plano de **dois deploys**: no primeiro a API aceita e entrega as
duas formas; só no segundo a forma antiga sai (o app instalado ainda roda a versão anterior por
um deploy, G-20).

Sempre proibido, sem exceção: campo de entrada `eDono` (G-11).

| esquema        | caminho             | mudança                             | deploy 1                                                                             | deploy 2                            |
| -------------- | ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| elenco.corpo   | posicao             | valor de enum removido (defensor)   | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.corpo   | posicao             | valor de enum removido (meio_campo) | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.detalhe | posicao             | valor de enum removido (defensor)   | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.detalhe | posicao             | valor de enum removido (meio_campo) | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.lista   | ativos[].posicao    | valor de enum removido (defensor)   | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.lista   | ativos[].posicao    | valor de enum removido (meio_campo) | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.lista   | inativos[].posicao  | valor de enum removido (defensor)   | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| elenco.lista   | inativos[].posicao  | valor de enum removido (meio_campo) | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| pesos.corpo    | expulsoComChuva     | campo de entrada novo e obrigatório | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| pesos.corpo    | expulsoSemChuva     | campo de entrada novo e obrigatório | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| pesos.painel   | historico[].expulso | campo removido                      | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |
| pesos.painel   | vigente.expulso     | campo removido                      | front e API saem juntos no mesmo Worker; banco aceita as posições antigas e as novas | RTP-0180 contrai o CHECK de posição |

## Retiradas em dois deploys (sem quebra no snapshot)

- `elenco.editar.corpo`, campo `dataEntrada`. Deploy 1: a API aceita e ignora o campo (a data de início só muda por `PUT /api/grupos/:grupoId/jogadores/:id/inicio`) e o app deixa de enviá-lo. Deploy 2: remover `dataEntrada` do corpo de editar, depois que o app anterior sair de uso.

## Respostas recusadas pelo app anterior (risco aceito)

Campo obrigatório novo em resposta é aditivo para o `checar-compatibilidade`, mas o app anterior
valida `jogadorDetalhe` com `strictObject` (`dados/cliente.ts`, `safeParse`) e recusa o corpo
novo. G-20 só seria cumprido sem enviar o campo, então o risco é aceito.

- `elenco.detalhe`, campo `inicioPontuacao`. Efeito: no app anterior, `GET/PATCH/POST …/jogadores/:id` passam a falhar na validação; a gravação acontece, mas a ficha do jogador mostra erro. Motivo: o campo é necessário à ficha e não há forma de entregá-lo sem enviá-lo. Mitigação: front e API saem no mesmo Worker; o service worker só guarda o ranking público; a `FaixaNovaVersao` recarrega com um toque; só a ficha (admin) é afetada. Avisar os admins para tocar Recarregar ao ver Nova versão antes de abrir a ficha.
- `elenco.detalhe`, campo `pontuacaoInicial`. Efeito, motivo e mitigação iguais aos de `inicioPontuacao`.
