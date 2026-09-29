"""
cenario.py — cenário completo das regras de negócio no banco (RLS e funções), com 11 usuários simulados.
Usado por supabase/tests/rodar.sh (variável TESTE_URL).
"""
import json, os, subprocess, sys
U = {k: f"00000000-0000-0000-0000-0000000000{i:02d}" for i, k in enumerate(
    ["ana", "bruno", "carla", "diego", "eva", "fel", "gil", "hid", "ian", "jo", "ze"], start=1)}
FALHAS = []
def q(sql, user=None, erro=False):
    pre = f"SET ROLE authenticated; SET request.jwt.claim.sub='{U[user]}';" if user else ""
    r = subprocess.run(["psql", os.environ["TESTE_URL"], "-X", "-q", "-t", "-A", "-F", "|", "-c", pre + sql], capture_output=True, text=True)
    err = r.returncode or "ERROR" in r.stderr
    if err and not erro: print("ERRO inesperado:", sql[:90], r.stderr.strip()); FALHAS.append(sql[:60])
    if erro: return r.stderr.strip().replace("ERROR:  ", "")
    return [l for l in r.stdout.strip().splitlines() if l]
def um(sql, user=None): r = q(sql, user); return r[0] if r else None
def lit(d): return "'" + json.dumps(d, ensure_ascii=False).replace("'", "''") + "'::jsonb"
def ok(cond, msg):
    print(("OK   " if cond else "FALHA"), msg)
    if not cond: FALHAS.append(msg)

TIPO = {"ana": "gestor", "bruno": "condomino", "carla": "condomino", "diego": "condomino", "eva": "condomino", "ze": "gestor"}
for k, uid in U.items():
    meta = {"nome": k.title(), "telefone": "3299900" + uid[-4:], "tipo": TIPO.get(k, "fornecedor")}
    q(f"INSERT INTO auth.users VALUES ('{uid}', '{json.dumps(meta)}')")
q(f"UPDATE perfis SET is_admin = true WHERE user_id = '{U['ze']}'")
ok(um("SELECT count(*) FROM perfis") == "11", "perfis criados pelo gatilho")

# Condomínio e membros
cond = um("SELECT criar_condominio(" + lit({"nome": "Residencial Ipês", "cep": "36010-000", "bairro": "Centro", "cidade": "Juiz de Fora",
          "uf": "MG", "latitude": -21.7642, "longitude": -43.3503, "unidades": 48, "logradouro": "Rua Halfeld", "numero": "100"}) + ")", "ana")
cod = um(f"SELECT codigo_convite FROM meus_condominios() WHERE id = '{cond}'", "ana")
ok(cod and len(cod) == 8, "síndico vê código de convite")
e = q(f"SELECT criar_condominio('{{\"nome\":\"X\"}}'::jsonb)", "fel", erro=True)
ok("fornecedor" in e, "fornecedor não cria condomínio: " + e)
for k in ["bruno", "carla", "diego", "eva"]:
    q(f"SELECT entrar_condominio('{cod.lower()}', 'Apto {k}')", k)
ok(um(f"SELECT membros_pendentes FROM meus_condominios() WHERE id = '{cond}'", "ana") == "4", "4 pedidos pendentes")
ok(um(f"SELECT count(*) FROM condominios", "eva") == "0", "pendente não vê o condomínio")
for k in ["bruno", "carla", "diego"]:
    q(f"SELECT gerenciar_membro('{cond}', '{U[k]}', 'aprovar', 'conselheiro')", "ana")
q(f"SELECT gerenciar_membro('{cond}', '{U['eva']}', 'aprovar')", "ana")
e = q(f"SELECT gerenciar_membro('{cond}', '{U['ana']}', 'papel', 'condomino')", "ana", erro=True)
ok("síndico" in e, "não remove o único síndico")
e = q(f"SELECT gerenciar_membro('{cond}', '{U['bruno']}', 'remover')", "eva", erro=True)
ok("Somente" in e, "condômino não gerencia membros")
mem = q(f"SELECT nome, papel, coalesce(unidade,'-') FROM membros_condominio('{cond}')", "eva")
ok(len(mem) == 5 and all(m.endswith("|-") or "Eva" in m for m in mem), "condômino vê nomes e papéis, sem unidades alheias")

# Fornecedores
def forn(k, cats, lat, lng, raio=30, cidade="Juiz de Fora", uf="MG"):
    ids = q(f"SELECT id FROM categorias WHERE slug IN ({','.join(repr(c) for c in cats)})")
    return um("SELECT salvar_fornecedor(" + lit({"razao_social": k.title() + " Serviços LTDA", "documento": "12.345.678/0001-" + U[k][-2:],
        "cep": "36000-000", "bairro": "Bairro " + k, "cidade": cidade, "uf": uf, "latitude": lat, "longitude": lng, "raio_km": raio,
        "telefone": "32988887777", "email_contato": k + "@ex.com", "categorias": ids}) + ")", k)
F = {"fel": forn("fel", ["eletrica"], -21.75, -43.36), "gil": forn("gil", ["eletrica", "limpeza"], -21.78, -43.34),
     "hid": forn("hid", ["hidraulica", "limpeza"], -22.9068, -43.1729, cidade="Rio de Janeiro", uf="RJ"),
     "ian": forn("ian", ["limpeza"], -21.77, -43.35), "jo": forn("jo", ["eletrica", "limpeza"], -21.76, -43.345, raio=10)}
for k in ["fel", "jo"]:
    d = um("SELECT registrar_documento(" + lit({"tipo": "nr10", "arquivo_path": f"{F[k]}/nr10.pdf", "validade": "2027-12-31"}) + ")", k)
    q(f"SELECT revisar_documento('{d}', 'aprovado')", "ze")
e = q("SELECT registrar_documento(" + lit({"tipo": "nr10", "arquivo_path": f"{F['jo']}/x.pdf"}) + ")", "gil", erro=True)
ok("fora da pasta" in e, "documento só na pasta do próprio fornecedor")
e = q(f"SELECT revisar_documento('{d}', 'recusado')", "fel", erro=True)
ok("administrador" in e, "fornecedor não revisa documento")
q(f"UPDATE fornecedores SET verificado = true WHERE id = '{F['gil']}'", "gil")
ok(um(f"SELECT verificado FROM fornecedores WHERE id = '{F['gil']}'") == "f", "fornecedor não se autoverifica")
for k in ["fel", "gil", "hid", "jo"]:
    q(f"SELECT verificar_fornecedor('{F[k]}', true)", "ze")

# Listas
cat = dict(l.split("|") for l in q("SELECT slug, id FROM categorias"))
sug = um("SELECT salvar_lista(" + lit({"condominio_id": cond, "escopo": "condominio", "titulo": "Trocar lâmpadas da garagem",
         "itens": [{"categoria_id": cat["eletrica"], "descricao": "Lâmpadas LED na garagem", "quantidade": 20}]}) + ")", "eva")
ok(um(f"SELECT status FROM listas WHERE id = '{sug}'", "eva") == "sugestao", "condômino cria sugestão para o condomínio")
lst = um("SELECT salvar_lista(" + lit({"condominio_id": cond, "escopo": "condominio", "titulo": "Manutenção elétrica e limpeza",
         "descricao": "Quadro geral e limpeza das áreas comuns", "itens": [
           {"categoria_id": cat["eletrica"], "descricao": "Revisão do quadro geral", "quantidade": 1},
           {"categoria_id": cat["limpeza"], "descricao": "Limpeza das áreas comuns", "quantidade": 1, "unidade_medida": "mês", "recorrencia": "mensal"}]}) + ")", "ana")
ok(um(f"SELECT count(*) FROM listas WHERE id = '{lst}'", "eva") == "0", "condômino não vê rascunho do síndico")
e = q(f"SELECT publicar_lista('{sug}')", "eva", erro=True)
ok("Somente" in e, "condômino não publica lista do condomínio")
n = um(f"SELECT publicar_lista('{lst}')", "ana")
ok(n == "3", f"match: 3 fornecedores compatíveis (veio {n})")
m = dict((r.split("|")[0], r.split("|")[1:]) for r in q(f"SELECT f.user_id, m.score, m.cobertura, m.motivos FROM matches m JOIN fornecedores f ON f.id = m.fornecedor_id WHERE lista_id = '{lst}'"))
nome = {v: k for k, v in U.items()}
ms = {nome[k]: v for k, v in m.items()}
print("     scores:", {k: v[0] + " cob " + v[1] for k, v in ms.items()})
ok(set(ms) == {"fel", "gil", "jo"}, "Rio fora do raio; não verificado fora")
ok(ms["gil"][1] == "0.50" and ms["fel"][1] == "0.50" and ms["jo"][1] == "1.00", "cobertura: Gil sem NR-10 só limpeza; Jo tudo")
ok(int(ms["jo"][0]) > int(ms["fel"][0]), "Jo (cobertura total) tem score maior")
print("     motivos Jo:", ms["jo"][2])
ok(um(f"SELECT count(*) FROM notificacoes WHERE tipo = 'oportunidade'") == "3", "3 fornecedores notificados")
ok(um(f"SELECT count(*) FROM listas WHERE id = '{lst}'", "eva") == "1", "condômino vê a lista publicada")

# Oportunidades (anonimizadas)
op = q("SELECT titulo, bairro, cidade, score FROM oportunidades()", "fel")
ok(len(op) == 1 and "Centro" in op[0], "fornecedor vê oportunidade com bairro")
ok(um("SELECT count(*) FROM condominios", "fel") == "0", "fornecedor não lê a tabela de condomínios")
det = json.loads(um(f"SELECT oportunidade_detalhe('{lst}')", "fel"))
ok("nome" not in det and "logradouro" not in det and len(det["itens"]) == 2, "detalhe sem nome/endereço")
ok({i["descricao"]: i["atende"] for i in det["itens"]} == {"Revisão do quadro geral": True, "Limpeza das áreas comuns": False}, "detalhe marca itens que o fornecedor atende")
e = q(f"SELECT oportunidade_detalhe('{lst}')", "hid", erro=True)
ok("não disponível" in e, "fornecedor fora do match não abre o detalhe")
it = dict(l.split("|") for l in q(f"SELECT descricao, id FROM itens WHERE lista_id = '{lst}'"))
iel, ilp = it["Revisão do quadro geral"], it["Limpeza das áreas comuns"]
def prop(k, itens, prazo=10):
    return um("SELECT enviar_proposta(" + lit({"lista_id": lst, "prazo_execucao_dias": prazo, "validade": "2027-01-31",
              "condicoes": "50% na entrada", "itens": [{"item_id": i, "valor_unitario": v} for i, v in itens]}) + ")", k)
e = q("SELECT enviar_proposta(" + lit({"lista_id": lst, "prazo_execucao_dias": 5, "validade": "2027-01-31", "itens": [{"item_id": ilp, "valor_unitario": 100}]}) + ")", "fel", erro=True)
ok("não pode atender" in e, "não cota item fora da categoria")
e = q("SELECT enviar_proposta(" + lit({"lista_id": lst, "prazo_execucao_dias": 5, "validade": "2027-01-31", "itens": [{"item_id": iel, "valor_unitario": 100}]}) + ")", "gil", erro=True)
ok("não pode atender" in e, "sem NR-10 não cota elétrica")
pf = prop("fel", [(iel, 4000)]); pg = prop("gil", [(ilp, 1500)])
cmp_ = json.loads(um(f"SELECT comparativo('{lst}')", "ana"))
ok(cmp_["liberado"] is False and cmp_["recebidas"] == 2 and cmp_["propostas"] == [], "comparativo bloqueado com 2 de 3")
ok(um(f"SELECT count(*) FROM propostas WHERE lista_id = '{lst}'", "ana") == "0", "síndico não lê propostas antes do mínimo")
e = q(f"SELECT escolher_proposta('{pf}')", "ana", erro=True)
ok("Aguarde" in e, "não escolhe antes do mínimo")
pj = prop("jo", [(iel, 3500), (ilp, 2500)])
ok(um(f"SELECT valor_total FROM propostas WHERE id = '{pj}'", "jo") == "6000.00", "total calculado no banco")
ok(um(f"SELECT count(*) FROM propostas", "jo") == "1", "fornecedor só vê a própria proposta")
cmp_ = json.loads(um(f"SELECT comparativo('{lst}')", "bruno"))
ok(cmp_["liberado"] and len(cmp_["propostas"]) == 3 and cmp_["pode_escolher"] is False, "conselheiro vê o comparativo, sem escolher")
e = q(f"SELECT comparativo('{lst}')", "eva", erro=True)
ok("acesso" in e, "condômino não vê o comparativo do condomínio")
e = q(f"SELECT escolher_proposta('{pj}')", "bruno", erro=True)
ok("Somente" in e, "conselheiro não escolhe")

# Escolha acima do limite → conselho
ct = um(f"SELECT escolher_proposta('{pj}')", "ana")
ok(um(f"SELECT status || '|' || exige_conselho FROM contratacoes WHERE id = '{ct}'") == "aguardando_aprovacao|true", "acima de R$ 5.000 vai ao conselho")
ok(um(f"SELECT status FROM listas WHERE id = '{lst}'") == "em_aprovacao", "lista em aprovação")
e = q(f"SELECT contatos_contratacao('{ct}')", "jo", erro=True)
ok("depois da aprovação" in e, "contatos bloqueados antes da aprovação")
e = q(f"SELECT votar_contratacao('{ct}', true)", "ana", erro=True)
ok("conselheiros" in e, "síndico não vota")
ok(um(f"SELECT votar_contratacao('{ct}', true)", "bruno") == "aguardando_aprovacao", "1 sim de 3: aguarda")
ok(um(f"SELECT votar_contratacao('{ct}', false, 'caro')", "carla") == "aguardando_aprovacao", "1x1: aguarda")
ok(um(f"SELECT votar_contratacao('{ct}', true)", "diego") == "aprovada", "2 de 3: aprovada (maioria simples)")
ok(um(f"SELECT string_agg(status, ',' ORDER BY valor_total) FROM propostas WHERE lista_id = '{lst}'") == "recusada,recusada,escolhida", "demais propostas recusadas")
c = json.loads(um(f"SELECT contatos_contratacao('{ct}')", "jo"))
ok(c["condominio"]["logradouro"] == "Rua Halfeld" and c["responsaveis"][0]["nome"] == "Ana", "fornecedor aprovado recebe endereço e responsável")
e = q(f"SELECT contatos_contratacao('{ct}')", "fel", erro=True)
ok("não participa" in e, "fornecedor não escolhido não vê contatos")
q(f"SELECT atualizar_contratacao('{ct}', 'em_execucao')", "jo")
e = q(f"SELECT atualizar_contratacao('{ct}', 'concluida')", "jo", erro=True)
ok("não permitida" in e, "fornecedor não conclui")
q(f"SELECT atualizar_contratacao('{ct}', 'concluida')", "ana")
q(f"SELECT avaliar('{ct}', 5::smallint, 'Ótimo')", "ana"); q(f"SELECT avaliar('{ct}', 4::smallint)", "jo")
e = q(f"SELECT avaliar('{ct}', 3::smallint)", "ana", erro=True)
ok("já foi avaliada" in e, "uma avaliação por lado")
ok(um(f"SELECT media || '|' || total FROM reputacao_fornecedor('{F['jo']}')", "eva") == "5.0|1", "reputação do Jo")
mc = um("SELECT lado || '|' || status || '|' || ja_avaliei FROM minhas_contratacoes()", "jo")
ok(mc == "fornecedor|concluida|true", "minhas_contratacoes do fornecedor")

# Recusa do conselho
lst2 = um("SELECT salvar_lista(" + lit({"condominio_id": cond, "escopo": "condominio", "titulo": "Limpeza geral",
          "itens": [{"categoria_id": cat["limpeza"], "descricao": "Limpeza pós-obra", "quantidade": 1}]}) + ")", "ana")
q(f"UPDATE condominios SET min_propostas = 1 WHERE id = '{cond}'", "ana")
ok(um(f"SELECT min_propostas FROM condominios WHERE id = '{cond}'") == "1", "síndico ajusta o mínimo de propostas")
q(f"UPDATE condominios SET limite_conselho = 1 WHERE id = '{cond}'", "eva")
ok(um(f"SELECT limite_conselho FROM condominios WHERE id = '{cond}'") == "5000.00", "condômino não altera regras")
q(f"SELECT publicar_lista('{lst2}')", "ana")
p2 = um("SELECT enviar_proposta(" + lit({"lista_id": lst2, "prazo_execucao_dias": 3, "validade": "2027-01-31", "itens": [{"item_id": um(f"SELECT id FROM itens WHERE lista_id='{lst2}'"), "valor_unitario": 7000}]}) + ")", "gil")
ct2 = um(f"SELECT escolher_proposta('{p2}')", "ana")
q(f"SELECT votar_contratacao('{ct2}', false)", "bruno")
ok(um(f"SELECT votar_contratacao('{ct2}', false)", "carla") == "recusada", "2 contra de 3: recusada")
ok(um(f"SELECT l.status || '|' || p.status FROM listas l, propostas p WHERE l.id = '{lst2}' AND p.id = '{p2}'") == "aberta|enviada", "lista volta a aberta")

# Lista da unidade (condômino)
lu = um("SELECT salvar_lista(" + lit({"condominio_id": cond, "escopo": "unidade", "titulo": "Chuveiro e tomadas",
        "itens": [{"categoria_id": cat["eletrica"], "descricao": "Trocar 4 tomadas", "quantidade": 4}]}) + ")", "eva")
ok(um(f"SELECT unidade FROM listas WHERE id = '{lu}'", "eva") == "Apto eva", "lista da unidade usa a unidade do membro")
q(f"SELECT publicar_lista('{lu}')", "eva")
ok(um(f"SELECT count(*) FROM listas WHERE id = '{lu}'", "ana") == "0", "síndico não vê lista da unidade")
iu = um(f"SELECT id FROM itens WHERE lista_id = '{lu}'", "eva")
pu = um("SELECT enviar_proposta(" + lit({"lista_id": lu, "prazo_execucao_dias": 1, "validade": "2027-01-31", "itens": [{"item_id": iu, "valor_unitario": 1500}]}) + ")", "fel")
ctu = um(f"SELECT escolher_proposta('{pu}')", "eva")
ok(um(f"SELECT status FROM contratacoes WHERE id = '{ctu}'") == "aprovada", "lista da unidade não passa pelo conselho (R$ 6.000)")
c = json.loads(um(f"SELECT contatos_contratacao('{ctu}')", "fel"))
ok(c["condominio"]["unidade"] == "Apto eva" and c["responsaveis"][0]["nome"] == "Eva", "contato da unidade é o condômino")

# Proteções gerais
e = q(f"INSERT INTO listas (condominio_id, criado_por, escopo, titulo) VALUES ('{cond}', '{U['eva']}', 'condominio', 'x')", "eva", erro=True)
ok("row-level security" in e, "insert direto em listas bloqueado")
e = q(f"UPDATE perfis SET is_admin = true WHERE user_id = '{U['eva']}'", "eva", erro=True)
ok("permission denied" in e, "usuário não se torna admin")
e = q("SELECT * FROM calcular_matches(NULL, NULL)", "ana", erro=True)
ok("permission denied" in e, "função interna fora da API")
ok(um("SELECT count(*) FROM categorias WHERE grupo = 'produto'") == "5", "categorias de produto semeadas")
pn = json.loads(um("SELECT painel()", "ana"))
print("     painel Ana:", pn["contratante"], "não lidas", pn["nao_lidas"])
pj_ = json.loads(um("SELECT painel()", "jo"))
print("     painel Jo:", pj_["fornecedor"])
ok(pj_["fornecedor"]["nota"] == 5.0, "painel do fornecedor com nota")
ok(json.loads(um("SELECT expirar()"))["propostas_expiradas"] == 0, "expirar roda")
print("\nFALHAS:", len(FALHAS)); [print(" -", f) for f in FALHAS]
sys.exit(1 if FALHAS else 0)

# Fim de cenario.py
