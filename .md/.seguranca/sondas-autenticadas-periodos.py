"""Sondas autenticadas do lote de períodos do jogador (TP-0210..0231): listar, corrigir, prévia de corrigir,
prévia de reativar e reativar com dataRetorno. SÓ contra o app local (127.0.0.1) com o banco de desenvolvimento
semeado por `pnpm seed`. Não apaga nada; cria no máximo UM jogador de teste no grupo do Racha de Domingo
(apelido SondaAudit-<mês-dia>) e o deixa ativo ao final. Uso: python sondas-autenticadas-periodos.py <base> <saida.json>"""
import json, sys, urllib.request, urllib.error

BASE, SAIDA = sys.argv[1], sys.argv[2]
assert BASE.startswith("http://127.0.0.1") or BASE.startswith("http://localhost"), "só local"
SENHA = "senha-de-teste-123"
HOJE = "2026-10-22"
APELIDO = "SondaAudit-" + HOJE[5:]
resultados = []


def req(metodo, caminho, corpo=None, cookie=None, extra=None, bruto=None):
    h = {}
    if cookie:
        h["Cookie"] = cookie
    data = None
    if bruto is not None:
        data = bruto.encode()
        h["Content-Type"] = "application/json"
    elif corpo is not None:
        data = json.dumps(corpo).encode()
        h["Content-Type"] = "application/json"
    if metodo not in ("GET", "HEAD") and not (extra and extra.get("sem_x_pelada")):
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


VAZAMENTO = ("Traceback", "stack", "SELECT ", "INSERT ", "UPDATE ", "postgres", "node_modules", "at async", "pg_", "constraint")


def sonda(nome, metodo, caminho, esperado, **kw):
    s, h, c = req(metodo, caminho, **kw)
    sem_vazamento = not any(t in c for t in VAZAMENTO)
    ok = s in esperado and h.get("X-Content-Type-Options", "").lower() == "nosniff" and sem_vazamento
    resultados.append({"nome": nome, "metodo": metodo, "caminho": caminho, "status": s, "esperado": esperado,
                       "nosniff": h.get("X-Content-Type-Options"), "sem_vazamento": sem_vazamento, "ok": ok,
                       "corpo": c[:200]})
    return s, c


M = login("marquinhos@exemplo.com.br")    # admin da Pelada de Quinta
C = login("carlos.racha@exemplo.com.br")  # admin do Racha de Domingo
R = login("rodrigo@exemplo.com.br", "Temporaria-teste-1")  # senha temporária (escopo restrito)
GQ = json.loads(req("GET", "/api/sessao/eu", cookie=M)[2])["grupos"][0]["id"]
GD = json.loads(req("GET", "/api/sessao/eu", cookie=C)[2])["grupos"][0]["id"]
JQ = json.loads(req("GET", f"/api/grupos/{GQ}/jogadores", cookie=M)[2])["ativos"][0]["id"]

# jogador de teste do grupo de domingo (reaproveita se já existe de uma rodada anterior)
lista = json.loads(req("GET", f"/api/grupos/{GD}/jogadores", cookie=C)[2])
todos = lista["ativos"] + lista["inativos"]
JD = next((j["id"] for j in todos if j["apelido"] == APELIDO), None)
if JD is None:
    s, _, c = req("POST", f"/api/grupos/{GD}/jogadores",
                  {"apelido": APELIDO, "anoNascimento": 1990, "posicao": "atacante", "dataEntrada": "2026-09-01"}, cookie=C)
    assert s in (200, 201), (s, c)
    JD = json.loads(c)["id"]
# garante o estado inicial: inativo, com a saída em 2026-09-20 e um só período fechado
s, _, c = req("GET", f"/api/grupos/{GD}/jogadores/{JD}/periodos", cookie=C)
pers = json.loads(c)["periodos"]
if len(pers) == 1 and pers[0]["fim"] is None:
    s, _, c = req("POST", f"/api/grupos/{GD}/jogadores/{JD}/inativar", {"dataSaida": "2026-09-20"}, cookie=C)
    assert s == 200, (s, c)
PER = json.loads(req("GET", f"/api/grupos/{GD}/jogadores/{JD}/periodos", cookie=C)[2])["periodos"]
PID = PER[0]["id"]
JA = json.loads(req("GET", f"/api/grupos/{GD}/jogadores", cookie=C)[2])["ativos"]
JA = next(j["id"] for j in JA if j["id"] != JD)  # outro jogador ativo, para 409 e para o IDOR de período
PA = json.loads(req("GET", f"/api/grupos/{GD}/jogadores/{JA}/periodos", cookie=C)[2])["periodos"][0]["id"]

L = f"/api/grupos/{GD}/jogadores/{JD}/periodos"
PC = f"{L}/{PID}"
PP = f"{PC}/previa"
RP = f"/api/grupos/{GD}/jogadores/{JD}/reativar/previa"
RE = f"/api/grupos/{GD}/jogadores/{JD}/reativar"
CORR = {"saida": "2026-09-22"}
RET = {"dataRetorno": "2026-10-01"}

# 1. Autenticação, CSRF, escopo
sonda("periodos listar: sem cookie", "GET", L, [401])
sonda("periodos listar: cookie forjado", "GET", L, [401], cookie="__Host-sessao=forjado")
sonda("periodos listar: senha temporária (escopo restrito)", "GET", L, [401, 403], cookie=R)
for nome, m, c, corpo in (("corrigir", "PUT", PC, CORR), ("previa corrigir", "POST", PP, CORR),
                          ("reativar previa", "POST", RP, RET), ("reativar", "POST", RE, RET)):
    sonda(f"{nome}: sem cookie", m, c, [401], corpo=corpo)
    sonda(f"{nome}: cookie forjado", m, c, [401], corpo=corpo, cookie="__Host-sessao=forjado")
    sonda(f"{nome}: sem X-Pelada (CSRF)", m, c, [403], corpo=corpo, cookie=C, extra={"sem_x_pelada": True})
    sonda(f"{nome}: senha temporária (escopo restrito)", m, c, [401, 403], corpo=corpo, cookie=R)
    sonda(f"{nome}: admin de outro grupo", m, c, [403, 404], corpo=corpo, cookie=M)

# 2. Isolamento / IDOR
sonda("periodos listar: admin de outro grupo", "GET", L, [403, 404], cookie=M)
sonda("periodos listar: grupo próprio, jogador de outro grupo", "GET", f"/api/grupos/{GQ}/jogadores/{JD}/periodos", [404], cookie=M)
sonda("periodos listar: jogador inexistente", "GET", f"/api/grupos/{GD}/jogadores/00000000-0000-4000-8000-000000000000/periodos", [404], cookie=C)
sonda("periodos listar: id não UUID", "GET", f"/api/grupos/{GD}/jogadores/abc/periodos", [400, 404], cookie=C)
sonda("periodos listar: id com SQLi", "GET", f"/api/grupos/{GD}/jogadores/%27%3BDROP%20TABLE%20jogadores--/periodos", [400, 404], cookie=C)
for nome, m, sufixo, corpo in (("corrigir", "PUT", "", CORR), ("previa corrigir", "POST", "/previa", CORR)):
    base = f"/api/grupos/{GD}/jogadores/{JD}/periodos"
    sonda(f"{nome}: período inexistente", m, f"{base}/00000000-0000-4000-8000-000000000000{sufixo}", [404], corpo=corpo, cookie=C)
    sonda(f"{nome}: período de outro jogador do mesmo grupo (IDOR)", m, f"{base}/{PA}{sufixo}", [404], corpo=corpo, cookie=C)
    sonda(f"{nome}: período não UUID", m, f"{base}/abc{sufixo}", [400, 404], corpo=corpo, cookie=C)
    sonda(f"{nome}: período com SQLi", m, f"{base}/%27%3BDROP%20TABLE%20periodos_ativos--{sufixo}", [400, 404], corpo=corpo, cookie=C)
    sonda(f"{nome}: jogador de outro grupo (par cruzado)", m, f"/api/grupos/{GQ}/jogadores/{JD}/periodos/{PID}{sufixo}", [404], corpo=corpo, cookie=M)
    sonda(f"{nome}: período alheio via grupo próprio e jogador próprio", m, f"/api/grupos/{GQ}/jogadores/{JQ}/periodos/{PID}{sufixo}", [404], corpo=corpo, cookie=M)
sonda("reativar previa: jogador de outro grupo", "POST", f"/api/grupos/{GQ}/jogadores/{JD}/reativar/previa", [404], corpo=RET, cookie=M)
sonda("reativar: jogador de outro grupo", "POST", f"/api/grupos/{GQ}/jogadores/{JD}/reativar", [404], corpo=RET, cookie=M)
sonda("reativar previa: jogador inexistente", "POST", f"/api/grupos/{GD}/jogadores/00000000-0000-4000-8000-000000000000/reativar/previa", [404], corpo=RET, cookie=C)
sonda("reativar: jogador inexistente", "POST", f"/api/grupos/{GD}/jogadores/00000000-0000-4000-8000-000000000000/reativar", [404], corpo=RET, cookie=C)
sonda("reativar previa: id não UUID", "POST", f"/api/grupos/{GD}/jogadores/abc/reativar/previa", [400, 404], corpo=RET, cookie=C)
sonda("reativar: id com SQLi", "POST", f"/api/grupos/{GD}/jogadores/%27%3BDROP%20TABLE%20jogadores--/reativar", [400, 404], corpo=RET, cookie=C)
sonda("reativar previa: jogador ativo (409, sem gravar)", "POST", f"/api/grupos/{GD}/jogadores/{JA}/reativar/previa", [409], corpo=RET, cookie=C)
sonda("reativar: jogador ativo (409, sem gravar)", "POST", f"/api/grupos/{GD}/jogadores/{JA}/reativar", [409], corpo=RET, cookie=C)

# 3. Validação de corpo (datas malformadas e extremas): nada disso pode virar 5xx nem gravar
DATAS_RUINS = [
    ("formato dd/mm/aaaa", "01/09/2026", [400, 422]), ("30/02", "2026-02-30", [400, 422]),
    ("mês 13", "2026-13-01", [400, 422]), ("dia 00", "2026-09-00", [400, 422]),
    ("futura", "2099-01-01", [400, 422]), ("amanhã", "2026-10-23", [400, 422]),
    ("9999-12-31", "9999-12-31", [400, 422]), ("ano 0000", "0000-01-01", [400, 409, 422]),
    ("ano 0001", "0001-01-01", [400, 409, 422]), ("1900-01-01", "1900-01-01", [400, 409, 422]),
    ("1999-12-31", "1999-12-31", [400, 409, 422]),
    ("SQLi", "2026-09-22'; DROP TABLE periodos_ativos;--", [400, 422]),
    ("com hora", "2026-09-22T00:00:00Z", [400, 422]), ("string vazia", "", [400, 422]),
    ("espaços", "          ", [400, 422]), ("unicode", "２０２６-０９-２２", [400, 422]),
    ("script", "<script>alert(1)</script>", [400, 422]),
]
CAMPOS = (("corrigir saida", "PUT", PC, "saida"), ("corrigir retorno", "PUT", PC, "retorno"),
          ("previa corrigir saida", "POST", PP, "saida"), ("previa corrigir retorno", "POST", PP, "retorno"),
          ("reativar previa", "POST", RP, "dataRetorno"))
for nome, m, c, campo in CAMPOS:
    for t, v, esp in DATAS_RUINS:
        sonda(f"{nome}: {t}", m, c, esp, corpo={campo: v}, cookie=C)
    for t, v in (("número", 20260922), ("null", None), ("array", ["2026-09-22"]), ("objeto", {"a": 1}), ("booleano", True)):
        sonda(f"{nome}: tipo errado ({t})", m, c, [400, 422], corpo={campo: v}, cookie=C)
    sonda(f"{nome}: campo extra", m, c, [400, 422], corpo={campo: "2026-09-22", "x": 1}, cookie=C)
    sonda(f"{nome}: campo de outro nome", m, c, [400, 422], corpo={"inicioPontuacao": "2026-09-22"}, cookie=C)
    sonda(f"{nome}: corpo array", m, c, [400, 422], corpo=[1, 2], cookie=C)
    sonda(f"{nome}: JSON malformado", m, c, [400, 422], bruto="{nao json", cookie=C)
    sonda(f"{nome}: corpo gigante (1 MB)", m, c, [400, 413, 422], bruto='{"%s":"' % campo + "A" * 1_000_000 + '"}', cookie=C)
for nome, m, c in (("corrigir", "PUT", PC), ("previa corrigir", "POST", PP), ("reativar previa", "POST", RP)):
    sonda(f"{nome}: corpo vazio", m, c, [400, 422], bruto="", cookie=C)
    sonda(f"{nome}: objeto vazio", m, c, [400, 422], corpo={}, cookie=C)
sonda("corrigir: saída e retorno nulos", "PUT", PC, [400, 422], corpo={"saida": None, "retorno": None}, cookie=C)
sonda("reativar: dataRetorno malformada", "POST", RE, [400, 422], corpo={"dataRetorno": "2026-02-30"}, cookie=C)
sonda("reativar: dataRetorno futura", "POST", RE, [400, 422], corpo={"dataRetorno": "2099-01-01"}, cookie=C)
sonda("reativar: dataRetorno 9999-12-31", "POST", RE, [400, 422], corpo={"dataRetorno": "9999-12-31"}, cookie=C)
sonda("reativar: dataRetorno 0000-01-01", "POST", RE, [400, 409, 422], corpo={"dataRetorno": "0000-01-01"}, cookie=C)
sonda("reativar: dataRetorno 0001-01-01", "POST", RE, [400, 409, 422], corpo={"dataRetorno": "0001-01-01"}, cookie=C)
sonda("reativar: dataRetorno 1900-01-01", "POST", RE, [400, 409, 422], corpo={"dataRetorno": "1900-01-01"}, cookie=C)
sonda("reativar: dataRetorno anterior à saída", "POST", RE, [400, 409, 422], corpo={"dataRetorno": "2026-09-10"}, cookie=C)
sonda("reativar: SQLi em dataRetorno", "POST", RE, [400, 422], corpo={"dataRetorno": "2026-10-01'; DROP TABLE jogadores;--"}, cookie=C)
sonda("reativar: campo extra", "POST", RE, [400, 422], corpo={"dataRetorno": "2026-10-01", "e_dono": True}, cookie=C)
sonda("reativar: tipo errado", "POST", RE, [400, 422], corpo={"dataRetorno": 20261001}, cookie=C)
sonda("reativar: JSON malformado", "POST", RE, [400, 422], bruto="{nao json", cookie=C)
sonda("reativar: corpo gigante (1 MB)", "POST", RE, [400, 413, 422], bruto='{"dataRetorno":"' + "A" * 1_000_000 + '"}', cookie=C)

# 4. Verbos errados
sonda("periodos listar: POST", "POST", L, [404, 405], corpo={}, cookie=C)
sonda("corrigir: GET", "GET", PC, [404, 405], cookie=C)
sonda("corrigir: DELETE", "DELETE", PC, [404, 405], cookie=C)
sonda("previa corrigir: PUT", "PUT", PP, [404, 405], corpo=CORR, cookie=C)
sonda("reativar previa: GET", "GET", RP, [404, 405], cookie=C)
sonda("reativar: PUT", "PUT", RE, [404, 405], cookie=C)

# 5. Caminho feliz (prévias não gravam; a correção com data igual à atual não grava nem audita)
sonda("periodos listar: admin do grupo", "GET", L, [200], cookie=C)
sonda("previa corrigir: saída atual", "POST", PP, [200], corpo={"saida": PER[0]["fim"]}, cookie=C)
sonda("previa corrigir: saída nova válida", "POST", PP, [200], corpo=CORR, cookie=C)
sonda("reativar previa: data válida", "POST", RP, [200], corpo=RET, cookie=C)
sonda("corrigir: mesma saída (nada grava)", "PUT", PC, [200], corpo={"saida": PER[0]["fim"]}, cookie=C)
# reativar com retorno retroativo válido (grava um período), depois corrige o retorno e devolve ao valor original
sonda("reativar: dataRetorno válida retroativa", "POST", RE, [200], corpo=RET, cookie=C)
sonda("reativar: de novo (já ativo, 409)", "POST", RE, [409], corpo=RET, cookie=C)
PER2 = json.loads(req("GET", L, cookie=C)[2])["periodos"]
if len(PER2) == 2:
    P2 = f"{L}/{PER2[1]['id']}"
    sonda("corrigir: retorno depois de hoje", "PUT", P2, [400, 422], corpo={"retorno": "2026-10-23"}, cookie=C)
    sonda("corrigir: retorno antes da saída do período anterior", "PUT", P2, [400, 409, 422], corpo={"retorno": "2026-09-10"}, cookie=C)
    sonda("corrigir: retorno 0000-01-01 no período real", "PUT", P2, [400, 409, 422], corpo={"retorno": "0000-01-01"}, cookie=C)
    sonda("corrigir: retorno 1900-01-01 no período real", "PUT", P2, [400, 409, 422], corpo={"retorno": "1900-01-01"}, cookie=C)
    sonda("corrigir: saída do período aberto", "PUT", P2, [400, 409, 422], corpo={"saida": "2026-10-10"}, cookie=C)
    sonda("corrigir: retorno igual (nada grava)", "PUT", P2, [200], corpo={"retorno": PER2[1]["inicio"]}, cookie=C)
    sonda("corrigir: retorno 2026-10-02 válido", "PUT", P2, [200], corpo={"retorno": "2026-10-02"}, cookie=C)
    sonda("corrigir: retorno volta a 2026-10-01", "PUT", P2, [200], corpo={"retorno": "2026-10-01"}, cookie=C)
else:
    resultados.append({"nome": "preparo: 2 períodos esperados após reativar", "status": len(PER2), "ok": False,
                       "corpo": json.dumps(PER2)[:200]})

# 6. Nada de períodos/dado pessoal no público; a listagem não vaza campos extras
s, _h, c = req("GET", "/api/publico/pelada-de-quinta/ranking")
resultados.append({"nome": "público ranking sem períodos/e-mail/id de conta", "status": s,
                   "ok": s == 200 and "periodo" not in c.lower() and "@" not in c and "\"contaId\"" not in c,
                   "corpo": c[:120]})
s, _h, c = req("GET", L, cookie=C)
resultados.append({"nome": "listar períodos: só id/tipo/datas/corrigivel (sem grupo_id, telefone, e-mail)", "status": s,
                   "ok": s == 200 and all(set(p) == {"id", "tipo", "inicio", "fim", "corrigivel"} for p in json.loads(c)["periodos"]),
                   "corpo": c[:200]})

falhas = [r for r in resultados if not r["ok"]]
json.dump({"jogador_de_teste": {"grupo": GD, "id": JD, "apelido": APELIDO}, "total": len(resultados), "falhas": len(falhas),
           "resultados": resultados}, open(SAIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(resultados), "sondas,", len(falhas), "falhas")
for r in falhas:
    print("FALHA", r["nome"], r["status"], r.get("esperado"), r.get("nosniff"), r["corpo"][:150])
