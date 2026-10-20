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
