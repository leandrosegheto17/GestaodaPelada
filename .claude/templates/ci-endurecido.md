# ci-endurecido.md — base de CI, deploy, backup e runbook

Ponto de partida do chapéu DevOps do `validador` (`agents/validador.md`, "Base endurecida desde o
primeiro lote"). Cada item abaixo foi, no projeto GestaodaPelada, uma `RTP` aberta **depois** da
primeira versão do arquivo (RTP-0095 a 0179). Escrever o arquivo já assim custa minutos; endurecer
depois custou dezenas de tarefas, cada uma com três agentes.

Como usar: ao criar ou tocar workflow, `docker-compose`, script de deploy/backup ou `DEPLOY.md`,
confira o arquivo contra a lista da seção correspondente. O QA e o DevSecOps conferem o diff contra
a mesma lista. O que o projeto decidir diferente vai para o `GUARDRAILS.md` como exceção, com motivo.

## 1. Workflows (`.github/workflows/*.yml`)

- [ ] **Ações de terceiros fixadas por SHA de commit** (`uses: dono/acao@<40 hex>  # vX.Y.Z`), nunca
      por tag ou branch. Ação local (`./…`) não pode conter `..`. Existe uma checagem automática
      (ex.: `checar-acoes-fixadas`) que reprova `uses` sem SHA, inclusive em estilo flow `{ uses: … }`.
- [ ] **`permissions:` mínimo** no topo (`contents: read`) e elevado só no job que precisa.
- [ ] **`actions/checkout` com `persist-credentials: false`**, em todos os workflows (CI, deploy, backup) e em
      todos os jobs. A mesma checagem de ações (lida com parser de YAML) reprova o checkout sem isso.
- [ ] **Nada de `${{ … }}` dentro de `run:`** com valor que vem de fora (input, branch, título de PR,
      saída de passo): passe por `env:` e use `"$VAR"` no shell. Rollback e restauração incluídos.
- [ ] **Segredo nunca em argumento de linha de comando nem em log.** Token para `curl`: arquivo de
      configuração ou cabeçalho lido de variável (sem aceitar diretiva injetada); `::add-mask::` para
      valor derivado de segredo (host de banco, id de recurso). `psql`/`pg_dump` não podem ecoar o
      host no log público.
- [ ] **Backup cifrado só com a chave pública** (ex.: destinatário `age` público no secret); a chave
      privada nunca entra no CI. Artefato de backup com retenção curta e nome sem dado pessoal.
- [ ] **Deploy só manual** (`workflow_dispatch`); push nunca faz deploy. Docs e runbook dizem a mesma coisa.
- [ ] **Lógica que decide algo vive em script testado**, não em `node -e`/`bash -c` inline no YAML
      (ex.: escolha do branch de restauração do banco).
- [ ] **Saída parseada de CLI** (`wrangler`, `gh`) usa o mesmo parser do teste de configuração, sem
      ruído do gerenciador de pacotes, e valida o formato (ex.: id em 32 hex) antes de imprimir ou usar.
- [ ] **Versão da ferramenta fixada** e comando compatível com ela (ex.: flags do `wrangler` antes do
      subcomando são reconhecidos pela checagem de deploy).
- [ ] **Job de e2e/visual** com `dist/` ausente tratado (mensagem clara, não erro cru) e provado em PR real.

## 2. Gerenciador de pacotes e cadeia de suprimento

- [ ] Política do gerenciador presente (no pnpm: `pnpm-workspace.yaml` com `minimumReleaseAge`
      adequado — prazo de 7 dias — e bloqueio de scripts de instalação não aprovados).
- [ ] Dependências transitivas com vulnerabilidade conhecida atualizadas ou sobrescritas.
- [ ] Checagem automática no CI de que as duas coisas acima continuam valendo.

## 3. `docker-compose` e ambiente local

- [ ] **Portas publicadas só em `127.0.0.1`** (`"127.0.0.1:5432:5432"`).
- [ ] **Sem URL absoluta, e-mail real, senha ou token em literal**: tudo por variável de ambiente com
      valor de exemplo em `.env.example` (a guarda de URL absoluta reprova literal no compose).
- [ ] `.gitignore` cobre: store do gerenciador, saídas temporárias, arquivo de entrada de importação
      com dado real, traces de e2e (que guardam senha temporária) e resíduos `*.tmp.*` de teste.

## 4. Cabeçalhos e respostas HTTP

- [ ] `X-Content-Type-Options: nosniff` em todas as respostas de `/api/*`.
- [ ] Cookie de sessão: `HttpOnly`, `Secure`, `SameSite`; cookie de sessão duplicado é **recusado**
      (não usa o primeiro).
- [ ] Limitador de taxa: binding ausente em produção **falha fechado** (ou avisa alto), nunca desliga
      o limite em silêncio.

## 5. Runbook (`DEPLOY.md` e semelhantes)

- [ ] Comandos sem segredo literal; senha pedida em prompt e **limpa da sessão** ao final
      (PowerShell: remover a variável e o histórico). Dado pessoal fora dos exemplos.
- [ ] Permissão de arquivo sensível (`.pgpass`, chaves): `chmod 600` no Linux/macOS e `icacls` em uma
      linha no Windows, com o equivalente indicado.
- [ ] Windows Home não tem EFS/BitLocker completo: o runbook diz isso e dá alternativa para o dump
      decifrado (tmpfs/RAM disk), avisando de swap em disco e de Device Encryption sem escrow.
- [ ] Apagar arquivo em NTFS/SSD **não é seguro**: o runbook reconhece isso e não promete.
- [ ] Caminhos e comandos de restauração testados (sem caminho quebrado) e com a opção para PowerShell.
- [ ] **Rotação de credencial do banco antes do primeiro uso real** (usuário de app e de backup).
- [ ] Nome do branch/ambiente de produção igual em workflow, SDD e tarefas.

## 6. Como conferir

1. Antes de abrir o PR: percorra a seção do tipo de arquivo que você tocou.
2. QA: o diff de um arquivo dessas categorias precisa passar pela lista; item não atendido é
   **retoque** (não RTP) enquanto a tarefa estiver aberta.
3. DevSecOps: arquivo de CI/deploy/compose/runbook é **risco alto** (`taskplan.py risco`), sempre
   revisão completa.
