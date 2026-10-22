"""Sonda autenticada da regra "quem saiu e voltou recomeça a contagem no retorno" (RTP-0207/0211): reativa e corrige
o retorno de um jogador de TESTE (apelido SondaAudit-<mês-dia>, Racha de Domingo) e, a cada mudança, confere o
ranking público e o PDF (mês atual, anterior, antigo e inválido) e as prévias: sem 5xx, nosniff, sem dado pessoal
(e-mail, telefone, id de conta, períodos) e sem apelido de outro grupo. SÓ local (127.0.0.1), banco de desenvolvimento;
não apaga nada. Uso: python sondas-autenticadas-retorno.py <base> <saida.json>"""
import json, sys, time, urllib.request, urllib.error

BASE, SAIDA = sys.argv[1], sys.argv[2]
assert BASE.startswith("http://127.0.0.1") or BASE.startswith("http://localhost"), "só local"
SENHA = "senha-de-teste-123"
APELIDO = "SondaAudit-10-22"
SLUG, SLUG_OUTRO = "racha-de-domingo", "pelada-de-quinta"
res = []


def req(m, p, corpo=None, ck=None):
    h = {}
    if ck: h["Cookie"] = ck
    d = None
    if m != "GET": h["X-Pelada"] = "1"
    if corpo is not None:
        d = json.dumps(corpo).encode(); h["Content-Type"] = "application/json"
    if p.startswith("/api/publico"): time.sleep(1.1)  # o limitador local é de 60 por minuto
    r = urllib.request.Request(BASE + p, data=d, method=m, headers=h)
    try:
        x = urllib.request.urlopen(r); return x.status, dict(x.headers), x.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def reg(nome, s, h, c, esperado, proibidos=()):
    achou = [t for t in proibidos if t in c]
    vaz = [t for t in ("Traceback", "SELECT ", "INSERT ", "node_modules", "at async", "pg_", "stack") if t in c]
    ok = s in esperado and (h.get("X-Content-Type-Options", "").lower() == "nosniff") and not achou and not vaz
    res.append({"nome": nome, "status": s, "esperado": esperado, "ok": ok, "achou": achou + vaz, "corpo": c[:160]})
    print(("ok   " if ok else "FALHA"), nome, s, achou + vaz)


s, h, _ = req("POST", "/api/sessao/entrar", {"email": "carlos.racha@exemplo.com.br", "senha": SENHA})
C = h["Set-Cookie"].split(";")[0]
GD = json.loads(req("GET", "/api/sessao/eu", ck=C)[2])["grupos"][0]["id"]
l = json.loads(req("GET", f"/api/grupos/{GD}/jogadores", ck=C)[2])
J = next(x for x in l["ativos"] + l["inativos"] if x["apelido"] == APELIDO)["id"]
# apelidos do outro grupo (não podem aparecer nas respostas públicas do Racha) e dados pessoais
s, h, c = req("POST", "/api/sessao/entrar", {"email": "marquinhos@exemplo.com.br", "senha": SENHA})
M = h["Set-Cookie"].split(";")[0]
GQ = json.loads(req("GET", "/api/sessao/eu", ck=M)[2])["grupos"][0]["id"]
outros = [x["apelido"] for x in json.loads(req("GET", f"/api/grupos/{GQ}/jogadores", ck=M)[2])["ativos"]]
proibidos = ["@exemplo", "telefone", "contaId", "conta_id", "senha", "periodos"]
print("apelidos do outro grupo:", outros)


ROT_TESTE = True


def publico(rotulo):
    for rota in ("ranking", "pdf"):
        for q, esp in (("", [200]), ("?mes=2026-09", [200]), ("?mes=2026-08", [200, 422]), ("?mes=2020-01", [200, 422]),
                       ("?mes=abc", [422]), ("?mes=2026-13", [422])):
            s, h, c = req("GET", f"/api/publico/{SLUG}/{rota}{q}")
            reg(f"{rotulo}: {rota}{q}", s, h, c, esp, proibidos + outros)
            if s == 200 and q == "" and ROT_TESTE:
                reg(f"{rotulo}: {rota} traz o teste", 200 if APELIDO in c else 0, h, c, [200])
    for rota in ("ranking", "pdf"):
        s, h, c = req("GET", f"/api/publico/{SLUG_OUTRO}/{rota}")
        reg(f"{rotulo}: outro grupo {rota} sem o teste", s, h, c, [200], [APELIDO])


L = f"/api/grupos/{GD}/jogadores/{J}"
# estado inicial: jogador inativo, com saída em 20/10 (se estiver ativo, inativa; não apaga nada)
per = json.loads(req("GET", f"{L}/periodos", ck=C)[2])["periodos"]
if per[-1]["fim"] is None:
    s, h, c = req("POST", f"{L}/inativar", {"dataSaida": "2026-10-20"}, C); reg("preparo: inativar 20/10", s, h, c, [200, 422])
ROT_TESTE = False
publico("estado inicial (inativo)")
ROT_TESTE = True
# reativa com retorno retroativo (prévia e gravação)
for rot, m, p, corpo, esp in (("previa reativar 21/10", "POST", f"{L}/reativar/previa", {"dataRetorno": "2026-10-21"}, [200]),
                              ("reativar 21/10", "POST", f"{L}/reativar", {"dataRetorno": "2026-10-21"}, [200]),
                              ("reativar de novo (ativo)", "POST", f"{L}/reativar", {"dataRetorno": "2026-10-21"}, [409])):
    s, h, c = req(m, p, corpo, C); reg(rot, s, h, c, esp, ["@exemplo"])
publico("depois de reativar 21/10")
per = json.loads(req("GET", f"{L}/periodos", ck=C)[2])["periodos"]
aberto = next(p for p in per if p["fim"] is None)
P = f"{L}/periodos/{aberto['id']}"
for novo in ("2026-10-22", "2026-10-21", "2026-10-20"):
    s, h, c = req("POST", f"{P}/previa", {"retorno": novo}, C); reg(f"previa corrigir retorno {novo}", s, h, c, [200, 422], ["@exemplo"])
    s, h, c = req("PUT", P, {"retorno": novo}, C); reg(f"corrigir retorno {novo}", s, h, c, [200, 422], ["@exemplo"])
    publico(f"retorno {novo}")
# retorno fora da regra: antes da saída anterior, futuro, e fora do histórico
for novo in ("2026-10-19", "2099-01-01", "1900-01-01"):
    s, h, c = req("PUT", P, {"retorno": novo}, C); reg(f"corrigir retorno inválido {novo}", s, h, c, [409, 422])
publico("depois dos inválidos")
falhas = [r for r in res if not r["ok"]]
json.dump(res, open(SAIDA, "w"), indent=1, ensure_ascii=False)
print(f"{len(res)} sondas, {len(falhas)} falhas")
