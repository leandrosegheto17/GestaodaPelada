"""Sondas autenticadas da TP-0209 (data de início). SÓ contra o app local com o banco descartável
pelada_auditoria semeado por `pnpm seed`. Uso: python sondas-autenticadas.py <base> <saida.json>"""
import json, sys, urllib.request, urllib.error

BASE, SAIDA = sys.argv[1], sys.argv[2]
assert BASE.startswith("http://127.0.0.1") or BASE.startswith("http://localhost"), "só local"
SENHA = "senha-de-teste-123"
resultados = []

def req(metodo, caminho, corpo=None, cookie=None, extra=None, bruto=None):
    h = {}
    if cookie: h["Cookie"] = cookie
    data = None
    if bruto is not None:
        data = bruto.encode(); h["Content-Type"] = "application/json"
    elif corpo is not None:
        data = json.dumps(corpo).encode(); h["Content-Type"] = "application/json"
    if metodo != "GET" and not (extra and extra.get("sem_x_pelada")):
        h["X-Pelada"] = "1"
    if extra:
        h.update({k: v for k, v in extra.items() if k != "sem_x_pelada"})
    r = urllib.request.Request(BASE + caminho, data=data, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(r) as x:
            return x.status, dict(x.headers), x.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()

def login(email, senha=SENHA):
    s, h, _ = req("POST", "/api/sessao/entrar", {"email": email, "senha": senha})
    assert s == 204, (email, s)
    return h["Set-Cookie"].split(";")[0]

def sonda(nome, metodo, caminho, esperado, **kw):
    s, h, c = req(metodo, caminho, **kw)
    ok = s in esperado and h.get("X-Content-Type-Options", "").lower() == "nosniff"
    resultados.append({"nome": nome, "metodo": metodo, "caminho": caminho, "status": s,
                       "esperado": esperado, "nosniff": h.get("X-Content-Type-Options"), "ok": ok,
                       "corpo": c[:200]})
    return s, c

M = login("marquinhos@exemplo.com.br")   # admin da Pelada de Quinta
C = login("carlos.racha@exemplo.com.br")  # admin do Racha de Domingo
R = login("rodrigo@exemplo.com.br", "Temporaria-teste-1")       # senha temporária (escopo restrito)
GQ = json.loads(req("GET", "/api/sessao/eu", cookie=M)[2])["grupos"][0]["id"]
GD = json.loads(req("GET", "/api/sessao/eu", cookie=C)[2])["grupos"][0]["id"]
JQ = json.loads(req("GET", f"/api/grupos/{GQ}/jogadores", cookie=M)[2])["ativos"][0]["id"]
JD = json.loads(req("GET", f"/api/grupos/{GD}/jogadores", cookie=C)[2])["ativos"][0]["id"]
P, E = f"/api/grupos/{GQ}/jogadores/{JQ}/inicio/previa", f"/api/grupos/{GQ}/jogadores/{JQ}/inicio"
OK = {"data": "2026-09-01"}

# autenticação e CSRF
for nome, m, c in (("previa", "POST", P), ("editar", "PUT", E)):
    sonda(f"{nome}: sem cookie", m, c, [401], corpo=OK)
    sonda(f"{nome}: cookie forjado", m, c, [401], corpo=OK, cookie="__Host-sessao=forjado")
    sonda(f"{nome}: sem X-Pelada (CSRF)", m, c, [403], corpo=OK, cookie=M, extra={"sem_x_pelada": True})
    sonda(f"{nome}: conta com senha temporária (escopo restrito)", m, c, [401, 403], corpo=OK, cookie=R)
# isolamento entre grupos
for nome, m, c in (("previa", "POST", P), ("editar", "PUT", E)):
    sonda(f"{nome}: admin do outro grupo usa grupo alheio", m, c, [403, 404], corpo=OK, cookie=C)
    sonda(f"{nome}: grupo próprio, jogador de outro grupo", m, f"/api/grupos/{GD}/jogadores/{JQ}/inicio" + ("/previa" if nome == "previa" else ""), [404], corpo=OK, cookie=C)
    sonda(f"{nome}: grupo alheio com jogador alheio (IDOR cruzado)", m, f"/api/grupos/{GQ}/jogadores/{JD}/inicio" + ("/previa" if nome == "previa" else ""), [404], corpo=OK, cookie=M)
    sonda(f"{nome}: jogador inexistente", m, f"/api/grupos/{GQ}/jogadores/00000000-0000-4000-8000-000000000000/inicio" + ("/previa" if nome == "previa" else ""), [404], corpo=OK, cookie=M)
    sonda(f"{nome}: id não-UUID", m, f"/api/grupos/{GQ}/jogadores/abc/inicio" + ("/previa" if nome == "previa" else ""), [400, 404], corpo=OK, cookie=M)
    sonda(f"{nome}: id com injeção SQL", m, f"/api/grupos/{GQ}/jogadores/%27%3BDROP%20TABLE%20jogadores--/inicio" + ("/previa" if nome == "previa" else ""), [400, 404], corpo=OK, cookie=M)
# validação do corpo / data
for nome, m, c in (("previa", "POST", P), ("editar", "PUT", E)):
    casos = [
        ("formato inválido", {"data": "01/09/2026"}), ("data impossível (30/02)", {"data": "2026-02-30"}),
        ("mês 13", {"data": "2026-13-01"}), ("futura", {"data": "2099-01-01"}),
        ("amanhã+1 ano", {"data": "2027-10-22"}), ("muito antiga/fora do intervalo", {"data": "1900-01-01"}),
        ("ano 0000", {"data": "0000-01-01"}), ("tipo errado (número)", {"data": 20260901}),
        ("tipo errado (null)", {"data": None}), ("campo ausente", {}), ("campo extra", {"data": "2026-09-01", "x": 1}),
        ("injeção SQL na data", {"data": "2026-09-01'; DROP TABLE jogadores;--"}),
        ("data com hora", {"data": "2026-09-01T00:00:00Z"}), ("array", [1, 2]),
    ]
    for t, corpo in casos:
        sonda(f"{nome}: {t}", m, c, [400, 422], corpo=corpo, cookie=M)
    sonda(f"{nome}: corpo malformado", m, c, [400, 422], bruto="{nao json", cookie=M)
    sonda(f"{nome}: corpo vazio", m, c, [400, 422], bruto="", cookie=M)
    sonda(f"{nome}: corpo gigante (1 MB)", m, c, [400, 413, 422], bruto='{"data":"' + "A" * 1_000_000 + '"}', cookie=M)
# caminho feliz e idempotência (grava no banco descartável)
sonda("previa: data válida", "POST", P, [200], corpo=OK, cookie=M)
s, c = sonda("editar: data válida", "PUT", E, [200], corpo=OK, cookie=M)
sonda("editar: mesma data (nada grava)", "PUT", E, [200], corpo=OK, cookie=M)
# verbo errado / leitura
sonda("previa: GET", "GET", P, [404, 405], cookie=M)
sonda("editar: DELETE", "DELETE", E, [404, 405], cookie=M)
# nova leitura: jogador expõe inicioPontuacao só ao admin do grupo
sonda("detalhe do jogador: sem cookie", "GET", f"/api/grupos/{GQ}/jogadores/{JQ}", [401, 403])
sonda("detalhe do jogador: admin de outro grupo", "GET", f"/api/grupos/{GQ}/jogadores/{JQ}", [403, 404], cookie=C)
sonda("detalhe do jogador: admin do grupo", "GET", f"/api/grupos/{GQ}/jogadores/{JQ}", [200], cookie=M)
sonda("editar jogador (PATCH) sem cookie", "PATCH", f"/api/grupos/{GQ}/jogadores/{JQ}", [401, 403], corpo={"apelido": "X"})
sonda("editar jogador: campo inicioPontuacao é recusado (strict)", "PATCH", f"/api/grupos/{GQ}/jogadores/{JQ}", [400, 422], corpo={"apelido": "Zé", "inicioPontuacao": "2099-01-01"}, cookie=M)
sonda("editar jogador: dataEntrada é recusada (strict)", "PATCH", f"/api/grupos/{GQ}/jogadores/{JQ}", [400, 422], corpo={"apelido": "Zé", "dataEntrada": "2026-09-01"}, cookie=M)
sonda("editar jogador: apelido válido por admin do outro grupo", "PATCH", f"/api/grupos/{GQ}/jogadores/{JQ}", [404], corpo={"apelido": "Zé"}, cookie=C)
sonda("editar jogador: sem X-Pelada", "PATCH", f"/api/grupos/{GQ}/jogadores/{JQ}", [403], corpo={"apelido": "Zé"}, cookie=M, extra={"sem_x_pelada": True})
for nome, m, c in (("previa", "POST", P), ("editar", "PUT", E)):
    sonda(f"{nome}: 0001-01-01 (limite inferior do tipo date)", m, c, [200, 400, 422], corpo={"data": "0001-01-01"}, cookie=M)
# público não vaza a data
s, _h, c = req("GET", "/api/publico/pelada-de-quinta/ranking")
resultados.append({"nome": "público ranking sem inicioPontuacao/e-mail/id de conta", "status": s,
                   "ok": s == 200 and "inicioPontuacao" not in c and "marquinhos@" not in c and "\"contaId\"" not in c,
                   "corpo": c[:120]})
s, _h, c = req("GET", "/api/publico/pelada-de-quinta/pdf")
resultados.append({"nome": "público pdf sem inicioPontuacao/e-mail", "status": s,
                   "ok": s == 200 and "inicioPontuacao" not in c and "@" not in c, "corpo": c[:120]})

falhas = [r for r in resultados if not r["ok"]]
json.dump({"total": len(resultados), "falhas": len(falhas), "resultados": resultados}, open(SAIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(resultados), "sondas,", len(falhas), "falhas")
for r in falhas: print("FALHA", r["nome"], r["status"], r.get("esperado"), r.get("nosniff"), r["corpo"][:150])
