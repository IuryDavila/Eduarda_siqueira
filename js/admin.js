import { CONFIG } from "./config.js";
import { PRODUCTS, BRANDS } from "./catalog.js";
import { toRow, fromRow, brandToRow } from "./db.js";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const say = (m, bad) => { const e = $("#st"); e.textContent = m; e.className = bad ? "err" : ""; };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const OPT = { origin: ["nacional", "internacional"], tier: ["acessível", "intermediária", "premium"], acab: ["matte", "natural", "glow"], cob: ["leve", "média", "alta"], pele: ["todas", "seca", "oleosa", "mista", "normal", "sensível"], conf: ["a confirmar", "verificado"] };
const PF = [["name", "Nome"], ["brand", "Marca"], ["cat", "Categoria", "text"], ["origin", "Origem", "sel"], ["tier", "Faixa", "sel"], ["acab", "Acabamento", "sel"], ["cob", "Cobertura", "sel"], ["pele", "Tipo de pele", "sel"], ["tags", "Tags (vírgula)"], ["price", "Preço (R$)"], ["url", "Link de compra (https)"], ["image", "Imagem (https)"], ["tons", "Tons disponíveis"], ["pitch", "Por que pode ser bom"], ["conf", "Dados", "sel"]];
let sb, rows = [], brands = [], editing = null;
async function boot() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) { $("#app").innerHTML = '<p class="empty">Preencha <code>js/config.js</code> e rode o SQL (veja o README) para usar o painel.</p>'; return; }
  try { const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm"); sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); } catch { say("Não foi possível carregar o Supabase.", true); return; }
  const { data } = await sb.auth.getUser(), user = data.user;
  if (!user) { $("#app").innerHTML = '<label>E-mail<input id="mail" type="email"></label><button class="btn" id="go">Receber link de acesso</button>'; $("#go").onclick = async () => { const e = $("#mail").value; if (!/^\S+@\S+\.\S+$/.test(e)) return say("E-mail inválido.", true); const r = await sb.auth.signInWithOtp({ email: e, options: { emailRedirectTo: location.href } }); say(r.error ? "Não foi possível enviar o link." : "Link enviado. Confira seu e-mail."); }; return; }
  const a = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!a.data) { $("#app").innerHTML = '<p class="empty">Esta conta não tem permissão de administração.</p><button class="btn ghost" id="out">Sair</button>'; $("#out").onclick = async () => { await sb.auth.signOut(); location.reload(); }; return; }
  await load(); draw();
}
async function load() { const [p, b] = await Promise.all([sb.from("products").select("*").order("name"), sb.from("brands").select("*").order("name")]); if (p.error || b.error) return say("Erro ao carregar dados. O SQL do painel foi executado?", true); rows = p.data.map(fromRow); brands = b.data; }
function field([k, l, t], v) { const val = Array.isArray(v) ? v.join(", ") : v ?? ""; if (t === "sel") return `<label>${l}<select name="${k}">${OPT[k].map((o) => `<option ${val === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`; return `<label>${l}<input name="${k}" value="${esc(val)}" ${k === "cat" ? 'list="cats"' : ""}></label>`; }
function draw() {
  const p = editing || { id: "", conf: "a confirmar", origin: "nacional", tier: "acessível", acab: "natural", cob: "média", pele: "todas", active: true };
  const cats = [...new Set([...rows.map((r) => r.cat), ...PRODUCTS.map((r) => r.cat)])];
  $("#app").innerHTML = `<p><button class="btn ghost" id="imp">Importar catálogo inicial</button> <button class="btn ghost" id="out">Sair</button></p>
  <h2>${editing ? "Editar produto" : "Novo produto"}</h2><datalist id="cats">${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</datalist>
  <form id="pf" class="grid form" novalidate>${PF.map((f) => field(f, p[f[0]])).join("")}<label><input type="checkbox" name="iury" ${p.iury ? "checked" : ""}> Recadinho do Iury</label><label><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}> Destaque</label><label><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}> Ativo (visível no site)</label><p class="err" id="pe" role="alert"></p><button class="btn" type="submit">Salvar produto</button> ${editing ? '<button class="btn ghost" type="button" id="cn">Cancelar</button>' : ""}</form>
  <h2>Produtos (${rows.length})</h2><div style="overflow-x:auto"><table><tr><th>Nome</th><th>Marca</th><th>Categoria</th><th>Preço</th><th>Status</th><th></th></tr>${rows.map((r, i) => `<tr><td>${esc(r.name)}</td><td>${esc(r.brand)}</td><td>${esc(r.cat)}</td><td>${r.price ?? "-"}</td><td>${r.active ? "ativo" : "oculto"}${r.featured ? " · destaque" : ""}</td><td><button data-e="${i}">Editar</button> <button data-d="${i}">Excluir</button></td></tr>`).join("")}</table></div>
  <h2>Marcas (${brands.length})</h2><form id="bf" class="grid form" novalidate>${["name:Nome", "origin:Origem", "tier:Faixa", "style:Estilo", "why:Por que sugerir"].map((x) => { const [k, l] = x.split(":"); return `<label>${l}<input name="${k}"></label>`; }).join("")}<button class="btn" type="submit">Salvar marca</button></form>
  <div style="overflow-x:auto"><table>${brands.map((b, i) => `<tr><td>${esc(b.name)}</td><td>${esc(b.tier || "")}</td><td><button data-bd="${i}">Excluir</button></td></tr>`).join("")}</table></div>`;
  $("#out").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("#imp").onclick = importAll; $("#pf").onsubmit = saveP; $("#bf").onsubmit = saveB;
  if ($("#cn")) $("#cn").onclick = () => { editing = null; draw(); };
  document.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => { editing = rows[+b.dataset.e]; draw(); scrollTo(0, 0); }));
  document.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => del("products", "slug", rows[+b.dataset.d].id)));
  document.querySelectorAll("[data-bd]").forEach((b) => (b.onclick = () => del("brands", "name", brands[+b.dataset.bd].name)));
}
async function del(t, col, v) { if (!confirm("Excluir definitivamente?")) return; const r = await sb.from(t).delete().eq(col, v); if (r.error) return say("Sem permissão ou erro ao excluir.", true); editing = null; await load(); draw(); say("Excluído."); }
async function saveP(e) {
  e.preventDefault(); const f = new FormData(e.target), g = (k) => String(f.get(k) ?? "").trim(), err = $("#pe");
  const price = g("price") === "" ? null : Number(g("price").replace(",", "."));
  const bad = !g("name") || !g("brand") || !g("cat") ? "Nome, marca e categoria são obrigatórios." : Number.isNaN(price) || price < 0 ? "Preço inválido." : [g("url"), g("image")].some((u) => u && !/^https:\/\//i.test(u)) ? "Links precisam começar com https://." : "";
  if (bad) { err.textContent = bad; return; } err.textContent = "";
  const p = { id: editing?.id || slug(g("brand") + "-" + g("name")), name: g("name"), brand: g("brand"), cat: g("cat"), origin: g("origin"), tier: g("tier"), acab: g("acab"), cob: g("cob"), pele: g("pele"), tags: g("tags").split(",").map((t) => t.trim()).filter(Boolean), price, url: g("url"), image: g("image"), tons: g("tons"), pitch: g("pitch"), conf: g("conf"), iury: f.has("iury"), featured: f.has("featured"), active: f.has("active") };
  const r = await sb.from("products").upsert(toRow(p), { onConflict: "slug" });
  if (r.error) return say("Não foi possível salvar. Esta conta é administradora?", true);
  editing = null; await load(); draw(); say("Produto salvo. O site público já mostra a mudança.");
}
async function saveB(e) {
  e.preventDefault(); const f = new FormData(e.target), b = Object.fromEntries([...f].map(([k, v]) => [k, String(v).trim()]));
  if (!b.name) return say("Informe o nome da marca.", true);
  const r = await sb.from("brands").upsert(brandToRow(b), { onConflict: "name" }); if (r.error) return say("Não foi possível salvar a marca.", true);
  await load(); draw(); say("Marca salva.");
}
async function importAll() {
  if (!confirm("Importar os produtos e marcas iniciais? Itens já existentes não serão alterados.")) return;
  const a = await sb.from("products").upsert(PRODUCTS.map(toRow), { onConflict: "slug", ignoreDuplicates: true });
  const b = await sb.from("brands").upsert(BRANDS.map(brandToRow), { onConflict: "name", ignoreDuplicates: true });
  if (a.error || b.error) return say("Falha na importação. Confira o SQL e suas permissões.", true);
  await load(); draw(); say("Catálogo inicial importado.");
}
boot();
