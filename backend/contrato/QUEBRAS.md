# Quebras de contrato aceitas

Uma mudança que remove ou renomeia campo de resposta, troca tipo, remove valor de enum ou torna
obrigatório um campo de entrada só passa em `pnpm --filter @pelada/contrato checar-compatibilidade`
se estiver listada aqui, com o plano de **dois deploys**: no primeiro a API aceita e entrega as
duas formas; só no segundo a forma antiga sai (o app instalado ainda roda a versão anterior por
um deploy, G-20).

Sempre proibido, sem exceção: campo de entrada `eDono` (G-11).

| esquema | caminho | mudança | deploy 1 | deploy 2 |
| ------- | ------- | ------- | -------- | -------- |
