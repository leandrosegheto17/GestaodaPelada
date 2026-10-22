#!/usr/bin/env node
// Compara, tela a tela, o mockup aprovado (.md/mockup/) com a aplicação rodando.
//
// Para cada tela × tamanho (viewport) do mapa `.md/mockup/telas.json`:
//   1. abre a página do mockup (arquivo local) e tira um print da página inteira;
//   2. abre a rota da aplicação, com as chamadas de API interceptadas e respondidas
//      pelos mesmos JSON do mockup (assim os dois mostram exatamente os mesmos dados),
//      e tira o print;
//   3. calcula a diferença pixel a pixel dentro do próprio navegador (canvas) e grava
//      mockup.png, app.png e diff.png (vermelho = pixel diferente).
//
// Única dependência: `playwright` (com o Chromium instalado: `npx playwright install
// chromium`), resolvida a partir de --pacote (padrão: pasta atual).
//
// Uso:
//   node .claude/scripts/comparar-visual.mjs --base-url http://localhost:5173
//        [--config .md/mockup/telas.json] [--tela T1[,T2]] [--viewport pc|celular]
//        [--saida .md/.visual/<data>] [--limite 1] [--limiar 0.1]
//        [--pacote web] [--iniciar "pnpm --filter web dev"]
//
//   --limite  porcentagem máxima de pixels divergentes por comparação (padrão 1)
//   --limiar  diferença mínima por canal (0–1) para um pixel contar como divergente
//             (padrão 0.1; absorve suavização de fonte)
//   --iniciar comando que sobe a aplicação; o script espera --base-url responder,
//             compara e derruba o processo no fim
//
// Formato de telas.json:
// {
//   "viewports": { "pc": { "width": 1440, "height": 900 },
//                  "celular": { "width": 390, "height": 844 } },
//   "respostas": [                      // valem para todas as telas
//     { "url": "**/api/v1/resumo", "arquivo": "respostas/resumo.json" }
//   ],
//   "ocultar": [".relogio"],            // seletores escondidos nos dois lados (conteúdo variável)
//   "telas": [
//     { "id": "T1", "nome": "Divergências", "estado": "sucesso",
//       "mockup": "telas/divergencias--sucesso.html", "rota": "/",
//       "viewports": ["pc", "celular"], "esperar": "main table",
//       "respostas": [ { "url": "**/api/v1/divergencias*", "arquivo": "respostas/divergencias.json" } ] },
//     { "id": "T1", "nome": "Divergências", "estado": "erro",
//       "mockup": "telas/divergencias--erro.html", "rota": "/",
//       "respostas": [ { "url": "**/api/v1/divergencias*", "status": 500,
//                        "arquivo": "respostas/erro-interno.json" } ] },
//     { "id": "T1", "estado": "carregando", "mockup": "telas/divergencias--carregando.html",
//       "rota": "/", "respostas": [ { "url": "**/api/v1/divergencias*", "pendente": true } ] }
//   ]
// }
// "recorte": { "mockup": "<seletor>", "app": "<seletor>" } (opcional, por tela) compara só o
// elemento indicado em cada lado, ignorando o que está atrás (usado nas folhas: a página de
// fundo é real no app e vazia no mockup). Com recorte, ".conteudo" deixa de ser ocultado.
// "userAgent": "<string>" (opcional, por tela) define o user agent só do lado da aplicação (usado quando
// o app muda conforme a plataforma, como a folha de instalar no iOS/Android).
// "passos": [ ... ] (opcional, por tela) interações executadas só no lado da aplicação, em ordem,
// depois do carregamento e antes do print (estados que exigem toque, digitação ou diálogo). Cada passo:
//   { "clicar": "<seletor Playwright>", "indice": 0 }            (ex.: "role=button[name='Reativar']")
//   { "preencher": "<seletor>", "valor": "2026-10-07", "indice": 0 }
//   { "esperar": "<seletor>" }                                    (espera ficar visível)
//   { "aguardarMs": 300 }
// Uma resposta com "pendente": true nunca responde; com "abortar": true a chamada falha como
// se não houvesse conexão. Em tela com passos, "pendente" vale só para a chamada disparada por
// eles (a página carrega normalmente).
// Respostas da tela têm prioridade sobre as globais. "pendente": true nunca responde
// (mantém a tela em "carregando"). Caminhos são relativos à pasta do telas.json.
// "sequencia": [ { "arquivo": "...", "status": 200 }, ... ] no lugar de "arquivo" responde a cada
// chamada da URL com o item seguinte (o último se repete): serve para a leitura que muda depois
// de uma gravação (ex.: ficha inativa que, depois de reativar, volta ativa).
// "recorte" aceita lista de seletores em cada lado (ex.: ["a", "b"]): os elementos são capturados
// um a um e empilhados na ordem dada, para comparar trechos separados da página.
//
// Código de saída: 0 = tudo dentro do limite; 1 = alguma comparação acima do limite
// ou com erro; 2 = uso incorreto / dependência ausente.

import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const chave = argv[i].slice(2);
    const valor = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[chave] = valor;
  }
  return args;
}

async function carregarPlaywright(pasta) {
  for (const nome of ["playwright", "@playwright/test"]) {
    try {
      const require = createRequire(join(resolve(pasta), "package.json"));
      const caminho = require.resolve(nome);
      const modulo = await import(pathToFileURL(caminho).href);
      const chromium = modulo.chromium ?? modulo.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

async function esperarUrl(url, segundos) {
  const fim = Date.now() + segundos * 1000;
  while (Date.now() < fim) {
    try {
      const resposta = await fetch(url);
      if (resposta.status < 500) return true;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function derrubar(processo) {
  if (!processo || processo.exitCode !== null) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${processo.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-processo.pid, "SIGTERM");
    }
  } catch {
    // já terminou
  }
}

const CSS_ESTAVEL = `
  *, *::before, *::after {
    animation: none !important; transition: none !important; caret-color: transparent !important;
  }`;

async function prepararPagina(pagina, ocultar) {
  const css = CSS_ESTAVEL + (ocultar.length ? `${ocultar.join(",")} { visibility: hidden !important; }` : "");
  await pagina.addStyleTag({ content: css });
  await pagina.evaluate(() => document.fonts.ready);
}

async function registrarRespostas(pagina, respostas, pastaConfig) {
  // As da tela vêm primeiro na lista: no Playwright, a última rota registrada tem
  // prioridade, então registramos em ordem inversa.
  for (const r of [...respostas].reverse()) {
    let chamadas = 0;
    await pagina.route(r.url, async (rota) => {
      if (r.pendente) return; // nunca responde: mantém o estado "carregando"
      if (r.abortar) return rota.abort("connectionrefused"); // simula a falta de conexão
      const item = r.sequencia ? r.sequencia[Math.min(chamadas++, r.sequencia.length - 1)] : r;
      const corpo = item.arquivo ? readFileSync(join(pastaConfig, item.arquivo), "utf8") : "";
      await rota.fulfill({
        status: item.status ?? 200,
        contentType: item.contentType ?? (item.status && item.status >= 400 ? "application/problem+json" : "application/json"),
        body: corpo,
      });
    });
  }
}

// Executa, na ordem, os passos de interação de um estado (só no lado da aplicação).
async function executarPassos(pagina, passos) {
  for (const passo of passos) {
    if (passo.clicar !== undefined) {
      await pagina.locator(passo.clicar).nth(passo.indice ?? 0).click({ timeout: 15000 });
    } else if (passo.preencher !== undefined) {
      await pagina.locator(passo.preencher).nth(passo.indice ?? 0).fill(String(passo.valor ?? ""), { timeout: 15000 });
    } else if (passo.esperar !== undefined) {
      await pagina.locator(passo.esperar).first().waitFor({ state: "visible", timeout: 15000 });
    } else if (passo.aguardarMs !== undefined) {
      await pagina.waitForTimeout(passo.aguardarMs);
    } else {
      throw new Error(`passo desconhecido: ${JSON.stringify(passo)}`);
    }
  }
}

// Folha: captura só o elemento; a página de fundo (real no app, vazia no mockup) fica de fora.
async function capturarElemento(pagina, seletor) {
  const alvo = pagina.locator(seletor).first();
  await alvo.waitFor({ state: "visible", timeout: 15000 });
  // O conteúdo acima do elemento difere entre mockup e app e deixa o topo dele em frações de pixel
  // diferentes; o texto é rasterizado conforme essa fração. Alinha o topo a um pixel inteiro nos dois lados.
  await alvo.evaluate((el) => {
    document.documentElement.style.paddingTop = "";
    const topo = el.getBoundingClientRect().top + window.scrollY;
    const folga = Math.ceil(topo - 0.001) - topo;
    if (folga > 0.001) document.documentElement.style.paddingTop = `${folga}px`;
  });
  return alvo.screenshot();
}

// Junta os prints de vários elementos numa imagem só, um embaixo do outro.
async function empilhar(navegador, pngs) {
  const pagina = await navegador.newPage();
  const base64 = await pagina.evaluate(async (fontes) => {
    const imagens = await Promise.all(
      fontes.map(
        (src) =>
          new Promise((ok, erro) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = erro;
            img.src = src;
          }),
      ),
    );
    const largura = Math.max(...imagens.map((i) => i.width));
    const altura = imagens.reduce((soma, i) => soma + i.height, 0);
    const c = new OffscreenCanvas(largura, altura);
    const ctx = c.getContext("2d");
    let y = 0;
    for (const img of imagens) {
      ctx.drawImage(img, 0, y);
      y += img.height;
    }
    const buffer = await (await c.convertToBlob({ type: "image/png" })).arrayBuffer();
    let binario = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binario);
  }, pngs.map((p) => `data:image/png;base64,${p.toString("base64")}`));
  await pagina.close();
  return Buffer.from(base64, "base64");
}

async function capturar(navegador, viewport, url, opcoes) {
  const contexto = await navegador.newContext({
    viewport, deviceScaleFactor: 1, reducedMotion: "reduce",
    ...(opcoes.userAgent ? { userAgent: opcoes.userAgent } : {}),
  });
  const pagina = await contexto.newPage();
  if (opcoes.respostas?.length) await registrarRespostas(pagina, opcoes.respostas, opcoes.pastaConfig);
  await pagina.goto(url, { waitUntil: opcoes.pendente ? "domcontentloaded" : "networkidle" });
  if (opcoes.esperar) {
    await pagina.waitForSelector(opcoes.esperar, { timeout: 15000 }).catch(() => {});
  }
  await prepararPagina(pagina, opcoes.ocultar);
  if (opcoes.passos?.length) await executarPassos(pagina, opcoes.passos);
  // Estado carregando: o app só mostra o esqueleto depois do atraso de 300 ms e do carregamento da rota.
  await pagina.waitForTimeout(opcoes.pendente ? 1500 : 300);
  // O mockup é um print estático, sem estado de foco; o app foca o primeiro controle ao abrir a folha.
  await pagina.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  let png;
  if (opcoes.recorte) {
    const seletores = [].concat(opcoes.recorte);
    const pngs = [];
    for (const seletor of seletores) pngs.push(await capturarElemento(pagina, seletor));
    png = pngs.length === 1 ? pngs[0] : await empilhar(navegador, pngs);
  } else {
    png = await pagina.screenshot({ fullPage: true });
  }
  await contexto.close();
  return png;
}

async function diferenca(navegador, pngA, pngB, limiar) {
  const pagina = await navegador.newPage();
  const resultado = await pagina.evaluate(
    async ({ a, b, limiar }) => {
      const carregar = (src) =>
        new Promise((ok, erro) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = erro;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const pixels = (img) => {
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ff00ff"; // área que só existe numa das imagens conta como diferente
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const pa = pixels(ia);
      const pb = pixels(ib);
      const saida = new OffscreenCanvas(w, h);
      const ctx = saida.getContext("2d");
      const dados = ctx.createImageData(w, h);
      const corte = limiar * 255;
      let diferentes = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const difere =
          Math.abs(pa[i] - pb[i]) > corte ||
          Math.abs(pa[i + 1] - pb[i + 1]) > corte ||
          Math.abs(pa[i + 2] - pb[i + 2]) > corte;
        if (difere) {
          diferentes++;
          dados.data[i] = 255; dados.data[i + 1] = 0; dados.data[i + 2] = 0; dados.data[i + 3] = 255;
        } else {
          const cinza = (pa[i] + pa[i + 1] + pa[i + 2]) / 3;
          dados.data[i] = dados.data[i + 1] = dados.data[i + 2] = 200 + cinza * 0.2;
          dados.data[i + 3] = 255;
        }
      }
      ctx.putImageData(dados, 0, 0);
      const blob = await saida.convertToBlob({ type: "image/png" });
      const buffer = await blob.arrayBuffer();
      let binario = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return {
        porcentagem: (diferentes / (w * h)) * 100,
        tamanhoMockup: `${ia.width}×${ia.height}`,
        tamanhoApp: `${ib.width}×${ib.height}`,
        diffBase64: btoa(binario),
      };
    },
    {
      a: `data:image/png;base64,${pngA.toString("base64")}`,
      b: `data:image/png;base64,${pngB.toString("base64")}`,
      limiar,
    },
  );
  await pagina.close();
  return resultado;
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  if (!args["base-url"]) {
    console.error("Uso: node .claude/scripts/comparar-visual.mjs --base-url <URL da aplicação> [opções] (ver cabeçalho)");
    process.exit(2);
  }
  const config = resolve(args.config ?? ".md/mockup/telas.json");
  if (!existsSync(config)) {
    console.error(`Mapa de telas não encontrado: ${config}`);
    process.exit(2);
  }
  const pastaConfig = dirname(config);
  const mapa = JSON.parse(readFileSync(config, "utf8"));
  const limite = Number(args.limite ?? 1);
  const limiar = Number(args.limiar ?? 0.1);
  const hoje = new Date().toISOString().slice(0, 10);
  const saida = resolve(args.saida ?? join(".md", ".visual", hoje));
  mkdirSync(saida, { recursive: true });
  const filtroTelas = args.tela ? new Set(args.tela.split(",")) : null;
  const filtroViewport = args.viewport ?? null;
  const baseUrl = args["base-url"].replace(/\/$/, "");

  const chromium = await carregarPlaywright(args.pacote ?? ".");
  if (!chromium) {
    console.error(
      "Playwright não encontrado a partir de --pacote. Instale no pacote da interface " +
        "(ex.: `pnpm --filter web add -D playwright` e `pnpm --filter web exec playwright install chromium`).",
    );
    process.exit(2);
  }

  let servidor = null;
  if (args.iniciar) {
    servidor = spawn(args.iniciar, { shell: true, stdio: "ignore", detached: process.platform !== "win32" });
    if (!(await esperarUrl(baseUrl, 120))) {
      derrubar(servidor);
      console.error(`A aplicação não respondeu em ${baseUrl} em 120 s.`);
      process.exit(1);
    }
  }

  const navegador = await chromium.launch();
  const linhas = [];
  let falhou = false;
  try {
    for (const tela of mapa.telas ?? []) {
      if (filtroTelas && !filtroTelas.has(tela.id)) continue;
      const estado = tela.estado ?? "sucesso";
      const respostas = [...(tela.respostas ?? []), ...(mapa.respostas ?? [])];
      // Com passos, a resposta pendente vale só para a chamada disparada por eles; a página carrega normalmente.
      const pendente = !tela.passos?.length && respostas.some((r) => r.pendente);
      const recorte = tela.recorte ?? null;
      // Com recorte, o `.conteudo` guarda a própria folha no app: esconder a página de fundo
      // esconderia a folha, então o seletor sai da lista (o recorte já a ignora).
      const ocultar = [...(mapa.ocultar ?? []), ...(tela.ocultar ?? [])].filter((s) => !(recorte && s === ".conteudo"));
      for (const nomeViewport of tela.viewports ?? Object.keys(mapa.viewports ?? {})) {
        if (filtroViewport && filtroViewport !== nomeViewport) continue;
        const viewport = mapa.viewports?.[nomeViewport];
        const rotulo = `${tela.id}-${estado}-${nomeViewport}`;
        try {
          if (!viewport) throw new Error(`viewport "${nomeViewport}" não definido em telas.json`);
          const arquivoMockup = join(pastaConfig, tela.mockup);
          if (!existsSync(arquivoMockup.split(/[?#]/)[0])) throw new Error(`mockup não encontrado: ${tela.mockup}`);
          const urlMockup = pathToFileURL(arquivoMockup.split(/[?#]/)[0]).href + (tela.mockup.match(/[?#].*$/)?.[0] ?? "");
          const pngMockup = await capturar(navegador, viewport, urlMockup, {
            ocultar, esperar: null, pastaConfig, recorte: recorte?.mockup,
          });
          const pngApp = await capturar(navegador, viewport, baseUrl + tela.rota, {
            ocultar, esperar: pendente ? null : tela.esperar, respostas, pendente, pastaConfig, recorte: recorte?.app, userAgent: tela.userAgent, passos: tela.passos,
          });
          const r = await diferenca(navegador, pngMockup, pngApp, limiar);
          writeFileSync(join(saida, `${rotulo}--mockup.png`), pngMockup);
          writeFileSync(join(saida, `${rotulo}--app.png`), pngApp);
          writeFileSync(join(saida, `${rotulo}--diff.png`), Buffer.from(r.diffBase64, "base64"));
          const ok = r.porcentagem <= limite && r.tamanhoMockup === r.tamanhoApp;
          if (!ok) falhou = true;
          linhas.push(
            `| ${tela.id} ${tela.nome ?? ""} | ${estado} | ${nomeViewport} | ${r.porcentagem.toFixed(2)}% | ` +
              `${r.tamanhoMockup} / ${r.tamanhoApp} | **${ok ? "OK" : "DIVERGE"}** | \`${rotulo}--diff.png\` |`,
          );
        } catch (erro) {
          falhou = true;
          linhas.push(`| ${tela.id} ${tela.nome ?? ""} | ${estado} | ${nomeViewport} | — | — | **ERRO** | ${String(erro.message ?? erro).replace(/\|/g, "\\|")} |`);
        }
      }
    }
  } finally {
    await navegador.close();
    derrubar(servidor);
  }

  const relatorio = [
    `# Comparação visual mockup × aplicação (${hoje})`,
    "",
    `Aplicação: \`${baseUrl}\` · Limite: ${limite}% de pixels · Limiar por canal: ${limiar} · Imagens: \`${saida.replace(/\\/g, "/")}\``,
    "",
    "| Tela | Estado | Tamanho | Pixels divergentes | Altura mockup / app | Resultado | Diferença |",
    "|---|---|---|---|---|---|---|",
    ...linhas,
    "",
    "DIVERGE = acima do limite **ou** página com tamanho diferente do mockup. Abra o `--diff.png` (vermelho = pixel " +
      "diferente) e os prints `--mockup.png`/`--app.png` lado a lado antes de concluir.",
  ].join("\n");
  writeFileSync(join(saida, "resumo.md"), relatorio + "\n", "utf8");
  console.log(relatorio);
  process.exit(falhou ? 1 : 0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
