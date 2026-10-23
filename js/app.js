import { PRODUCTS, BRANDS, WINKS } from "./catalog.js";
import { consult, CONCEALER_TIPS } from "./recommendations.js";
import { makeLook } from "./looks.js";
// Eduarda Beauty — storage, perfil, descoberta, recomendações e catálogo em um só módulo.
import { CONFIG } from "./config.js";
import { loadRemote, mergeRemote } from "./db.js";
const KEY = "eduarda:v1";
// Cada página só tem parte dos elementos: o que faltar vira um elemento solto, sem efeito.
const $ = (s) => document.querySelector(s) || document.createElement("input");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FIELDS = [
  ["tom", "Tom de pele", ["muito claro", "claro", "médio", "moreno", "escuro", "muito escuro", "não sei"]],
  ["subtom", "Subtom", ["quente", "frio", "neutro", "não sei"]],
  ["pele", "Tipo de pele", ["seca", "oleosa", "mista", "normal", "sensível", "não sei"]],
  ["acab", "Acabamento preferido", ["matte", "natural", "luminoso", "glow", "não sei"]],
  ["cob", "Cobertura", ["leve", "média", "alta", "não sei"]],
  ["estilo", "Estilo", ["natural", "romântico", "elegante", "clássico", "marcante", "artístico"]],
  ["tier", "Faixa de preço", ["acessível", "intermediária", "premium", "não sei"]],
];
const QUESTIONS = [
  { q: "Qual acabamento você prefere?", k: "acab", o: [["natural", "#C98291"], ["matte", "#65483F"], ["luminoso", "#EAD5D0", "#65483F"]] },
  { q: "Quais tons chamam sua atenção?", k: "paleta", o: [["rosados", "#C98291"], ["terrosos", "#65483F"], ["neutros", "#B9A79F"], ["vibrantes", "#783F50"]] },
  { q: "Prefere produtos…", k: "tier", o: [["acessível", "#C98291"], ["intermediária", "#783F50"], ["premium", "#65483F"]] },
  { q: "Para um encontro, qual estilo?", k: "estilo", o: [["natural", "#C98291"], ["romântico", "#B86B78"], ["elegante", "#783F50"], ["marcante", "#65483F"]] },
];

// ---- storage (local por padrão; nuvem se configurada e logada)
const blank = () => ({ profile: {}, likes: {}, favs: [], skipped: [], notes: "", seen: 0, own: {}, mine: [], looks: [] });
let S = blank(), sb = null, user = null;
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2200); };
const local = () => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); } };
async function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast("Não foi possível salvar neste navegador."); return; }
  if (sb && user) { const { error } = await sb.from("beauty_profiles").upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() }); if (error) toast("Falha ao sincronizar com a nuvem."); }
}
async function initCloud() {
  const m = $("#mode");
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) { m.textContent = "Modo demonstração: suas escolhas ficam apenas neste navegador, não na nuvem. Preços e links de compra ainda não foram verificados.."; return; }
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    try { mergeRemote(PRODUCTS, BRANDS, await loadRemote(sb)); } catch { /* segue com o catálogo local */ }
    const { data } = await sb.auth.getUser(); user = data.user;
    if (user) { const r = await sb.from("beauty_profiles").select("data").eq("user_id", user.id).maybeSingle(); if (r.data) S = { ...blank(), ...r.data.data }; m.textContent = "Sincronizado na nuvem como " + user.email; }
    else { m.textContent = "Nuvem configurada, mas você não entrou. Salvando só neste navegador."; $("#cloud").innerHTML = '<label>E-mail para entrar <input id="mail" type="email"></label><button class="btn ghost" id="login">Receber link de acesso</button>'; $("#login").onclick = async () => { const e = $("#mail").value; if (!/^\S+@\S+\.\S+$/.test(e)) return toast("Informe um e-mail válido."); const r = await sb.auth.signInWithOtp({ email: e, options: { emailRedirectTo: location.href } }); toast(r.error ? "Não foi possível enviar o link." : "Link enviado. Confira seu e-mail."); }; }
  } catch { m.textContent = "Não foi possível conectar à nuvem. Modo demonstração (somente neste navegador)."; }
}

// ---- recomendação (pontuação simples, sempre com motivo)
function score(p) {
  const f = S.profile, why = []; let s = 0;
  if (S.likes[p.id] === "nao") return { s: -99, why };
  if (f.acab && f.acab !== "não sei" && (p.acab === f.acab || (f.acab === "luminoso" && p.acab === "glow"))) { s += 2; why.push("acabamento " + p.acab); }
  if (f.paleta && p.tags.includes(f.paleta)) { s += 2; why.push("tons " + f.paleta); }
  if (f.tier && f.tier === p.tier) { s += 1; why.push("sua faixa de preço"); }
  if (f.pele && (p.pele === f.pele || p.pele === "todas")) s += 1;
  if (S.likes[p.id] === "gostei") s += 3;
  if (p.featured) s += 1;
  return { s, why };
}
const explain = () => { const f = S.profile, b = []; if (f.acab && f.acab !== "não sei") b.push("acabamentos " + f.acab + "s"); if (f.paleta) b.push("tons " + f.paleta); return b.length ? "Selecionamos estas opções porque você demonstrou preferência por " + b.join(" e ") + "." : "Responda algumas perguntas e as sugestões passam a combinar com você."; };

// ---- perfil
function renderProfile() {
  $("#profile").innerHTML = FIELDS.map(([k, l, o]) => `<label>${l}<select name="${k}"><option value="">—</option>${o.map((v) => `<option ${S.profile[k] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`).join("") + `<label>Produtos que já uso<input name="usa" value="${esc(S.profile.usa)}"></label>`;
  $("#profile").onchange = (e) => { S.profile[e.target.name] = e.target.value; save(); renderAll(); toast("Preferência atualizada."); };
}
function renderDiscover() {
  const q = QUESTIONS.find((x) => !S.profile[x.k] && !S.skipped.includes(x.k)), d = $("#discover");
  if (!q) { d.innerHTML = `<h3>Separei algumas opções com a sua cara.</h3><p>Quer mudar algo? Ajuste acima ou <button class="btn ghost" id="redo">refazer as escolhas</button></p>`; $("#redo").onclick = () => { QUESTIONS.forEach((x) => delete S.profile[x.k]); S.skipped = []; save(); renderAll(); }; return; }
  d.innerHTML = `<h3>${q.q}</h3><div class="opts">${q.o.map(([v, c, t]) => `<button class="opt" style="--c:${c};${t ? "color:" + t : ""}" data-v="${v}">${v}</button>`).join("")}</div><p><button class="btn ghost" id="skip">Agora não</button></p>`;
  d.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { S.profile[q.k] = b.dataset.v; save(); renderAll(); toast("Anotado."); }));
  $("#skip").onclick = () => { S.skipped.push(q.k); save(); renderDiscover(); };
}

// ---- catálogo
const money = (v) => (v == null ? "Preço não informado" : "R$ " + v.toFixed(2).replace(".", ","));
function card(p, why) {
  const l = S.likes[p.id], fav = S.favs.includes(p.id), b = (k, id, t, on) => `<button data-a="${k}" data-id="${id}" aria-pressed="${on}">${t}</button>`;
  const img = p.image ? `<div class="ph"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>` : '<div class="ph" role="img" aria-label="Imagem ilustrativa, sem foto do produto"></div>';
  return `<article class="card">${img}<div class="b"><h3>${esc(p.name)}</h3><div class="sub">${esc(p.brand)} · ${money(p.price)}</div><p class="pitch">${esc(p.pitch || "")}</p>${why.length ? `<small>Combina por: ${esc(why.join(", "))}</small>` : ""}<div class="row">${b("fav", p.id, "♥ Favorito", fav)}${b("own", p.id, "+ Nécessaire", !!S.own[p.id])}</div><details><summary>Detalhes</summary><div class="det"><div><span class="tag">${esc(p.origin)}</span><span class="tag">${esc(p.cat)}</span><span class="tag">${esc(p.acab)}</span><span class="tag">cobertura ${esc(p.cob)}</span></div><small>Tons: ${esc(p.tons)}</small><small>Dados: ${p.conf === "verificado" ? "conferidos em fonte pública" : "a confirmar na marca"}</small><small><a href="https://www.google.com/search?q=${encodeURIComponent(p.brand + " " + p.name)}" rel="noopener" target="_blank">Pesquisar este produto</a></small><small>${p.url ? `<a href="${esc(p.url)}" rel="noopener" target="_blank">Ver na loja</a>` : "Link de compra ainda não verificado"}</small><div class="row">${b("gostei", p.id, "Gostei", l === "gostei")}${b("quero", p.id, "Quero experimentar", l === "quero")}${b("nao", p.id, "Não é meu estilo", l === "nao")}</div></div></details></div></article>`;
}
function renderCatalog() {
  const q = $("#q").value.toLowerCase(), c = $("#cat").value, o = $("#sort").value;
  let list = PRODUCTS.filter((p) => (!c || p.cat === c) && (p.name + p.brand).toLowerCase().includes(q)).map((p) => ({ p, ...score(p) })).filter((x) => x.s > -99);
  if (o === "rec") list.sort((a, b) => b.s - a.s); else if (o === "name") list.sort((a, b) => a.p.name.localeCompare(b.p.name)); else list.sort((a, b) => (a.p.price ?? 1e9) - (b.p.price ?? 1e9));
  $("#cards").innerHTML = list.length ? list.map((x) => card(x.p, x.why)).join("") : '<p class="empty">Nada encontrado. Tente outra busca ou categoria.</p>';
  $("#reco-why").textContent = explain();
}
function renderBrands() {
  const t = S.profile.tier, st = S.profile.estilo;
  $("#brands").innerHTML = BRANDS.map((b) => { const m = []; if (t && b.tier === t) m.push("combina com sua faixa de preço"); if (st && b.style === st) m.push("estilo " + st); return `<article class="card"><div class="b"><h3>${esc(b.name)}</h3><span class="tag">${esc(b.origin)}</span><span class="tag">${esc(b.tier)}</span><p>${esc(b.why)}</p><small>${m.length ? "Sugerida porque " + m.join(" e ") + "." : "Ainda sem dados suficientes para ligar esta marca às suas preferências."}</small></div></article>`; }).join("");
}
function renderFavs() {
  const items = PRODUCTS.filter((p) => S.favs.includes(p.id) || S.likes[p.id] === "quero");
  $("#favs").innerHTML = items.length ? items.map((p) => card(p, [])).join("") : '<p class="empty">Nada por aqui ainda. Toque em ♥ ou "Quero experimentar" nos produtos.</p>';
  const tot = items.filter((p) => p.price != null).reduce((a, p) => a + p.price, 0);
  $("#compare").innerHTML = items.length > 1 ? `<h3>Comparar</h3><div style="overflow-x:auto"><table><tr><th>Produto</th><th>Marca</th><th>Acabamento</th><th>Cobertura</th><th>Pele</th><th>Preço</th></tr>${items.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.brand)}</td><td>${p.acab}</td><td>${p.cob}</td><td>${p.pele}</td><td>${money(p.price)}</td></tr>`).join("")}</table></div><p>Total estimado (só itens com preço informado): ${money(tot)}</p>` : "";
}
function tools() {
  const ranked = PRODUCTS.map((p) => ({ p, ...score(p) })).filter((x) => x.s > -99).sort((a, b) => b.s - a.s);
  const f = S.profile, bases = ranked.filter((x) => x.p.cat === "Bases").slice(0, 3);
  const wink = ranked[0]?.p.iury && Math.random() < 0.5 ? `<em>${WINKS[Math.floor(Math.random() * WINKS.length)]}</em>` : "";
  const t = ranked[0] ? `<h3>Sugestão do dia</h3><p><b>${esc(ranked[0].p.brand)} · ${esc(ranked[0].p.name)}</b><br>${esc(ranked[0].p.pitch)} ${ranked[0].why.length ? "Combina por: " + esc(ranked[0].why.join(", ")) + "." : ""} ${wink}</p>` : "";
  const bs = f.pele || f.acab || f.cob ? bases.map((x) => `<li>${esc(x.p.brand)} ${esc(x.p.name)} <span class="tag">${x.s >= 3 && x.p.conf === "verificado" ? "boa correspondência" : "possibilidade a testar"}</span></li>`).join("") : "";
  $("#tools").innerHTML = t + `<h3>Encontrar minha base</h3>` + (bs ? `<ol>${bs}</ol><small>Ninguém acerta o tom só pela tela. Teste na mandíbula, à luz natural.</small>` : '<p class="muted">Conte seu tipo de pele, acabamento e cobertura em Minha Pele para ver sugestões.</p>');
}
let CMP = [];
function renderConsult() {
  const r = consult(S.profile, $("#occ").value, PRODUCTS), tom = S.profile.tom;
  const item = ({ p, hits, gaps, conf }) => `<article class="card"><div class="b"><h3>${esc(p.name)}</h3><div class="sub">${esc(p.brand)} · ${money(p.price)} · <span class="tag">confiança ${conf}</span></div><small><b>Combina:</b> ${esc(hits.join(", ") || "ainda sem pontos em comum")}.</small><details><summary>Detalhes</summary><div class="det"><div><span class="tag">${esc(p.acab)}</span><span class="tag">cobertura ${esc(p.cob)}</span></div>${gaps.length ? `<small><b>Atenção:</b> ${esc(gaps.join("; "))}.</small>` : ""}<small><b>Tom:</b> ${esc(p.tons)}${tom && tom !== "não sei" ? ` Para pele ${esc(tom)}, escolha na cartela uma profundidade equivalente e teste ao lado.` : ""}</small><small><b>Subtom:</b> sem dado confiável deste produto. Confira na cartela.</small><small>${p.url ? `<a href="${esc(p.url)}" rel="noopener" target="_blank">Página oficial</a>` : "Link de compra ainda não verificado"}</small><label class="chk"><input type="checkbox" data-cmp="${p.id}" ${CMP.includes(p.id) ? "checked" : ""}> Comparar</label></div></details></div></article>`;
  $("#consult").innerHTML = (r.missing.length ? `<p class="empty">Para afinar as sugestões, conte em Minha Pele: ${esc(r.missing.join(", "))}. Sem isso, a confiança fica menor.</p>` : "") + `<h3>Seu subtom</h3><p>${esc(r.undertone)}</p><h3>Bases</h3><div class="grid cards">${r.bases.map(item).join("")}</div><h3>Corretivos</h3><div class="grid cards">${r.concealers.map(item).join("")}</div><h3>Como usar o corretivo</h3><ul>${CONCEALER_TIPS.map((t) => `<li>${t}</li>`).join("")}</ul>`;
  const sel = PRODUCTS.filter((p) => CMP.includes(p.id));
  $("#cmpbase").innerHTML = sel.length > 1 ? `<h3>Lado a lado</h3><div style="overflow-x:auto"><table><tr><th></th>${sel.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr>${[["Marca", "brand"], ["Cobertura", "cob"], ["Acabamento", "acab"], ["Pele", "pele"], ["Tons", "tons"], ["Dados", "conf"]].map(([l, k]) => `<tr><th>${l}</th>${sel.map((p) => `<td>${esc(p[k])}</td>`).join("")}</tr>`).join("")}<tr><th>Preço</th>${sel.map((p) => `<td>${money(p.price)}</td>`).join("")}</tr></table></div>` : sel.length ? "<p class=\"muted\">Marque mais um produto para comparar.</p>" : "";
}
$("#occ").addEventListener("input", renderConsult);
document.addEventListener("change", (e) => { const id = e.target.dataset?.cmp; if (!id) return; CMP = e.target.checked ? [...CMP, id].slice(-3) : CMP.filter((x) => x !== id); renderConsult(); });
const num = (v) => { const t = String(v).trim().replace(",", "."); return t === "" ? null : /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN; };
function renderNec() {
  const list = PRODUCTS.filter((p) => S.own[p.id]);
  const tot = list.filter((p) => S.own[p.id].status === "quero" && typeof S.own[p.id].price === "number").reduce((s, p) => s + S.own[p.id].price, 0);
  $("#nec").innerHTML = list.length ? `<div class="grid cards">${list.map((p) => { const o = S.own[p.id], f = (k, l, extra = "") => `<label>${l}<input data-o="${k}" data-id="${p.id}" ${extra} value="${esc(o[k] ?? "")}"></label>`; return `<article class="card"><div class="b"><h3>${esc(p.name)}</h3><small>${esc(p.brand)} · ${esc(p.cat)}</small><label>Status<select data-o="status" data-id="${p.id}">${["tenho", "quero", "acabando"].map((x) => `<option ${o.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>${f("price", "Preço que encontrei (R$)", 'inputmode="decimal"')}${f("tom", "Tom que uso")}${f("note", "Minhas notas")}</div></article>`; }).join("")}</div><p>Lista de compras (itens "quero" com preço): <b>R$ ${tot.toFixed(2).replace(".", ",")}</b></p>` : '<p class="empty">Sua nécessaire está vazia. Escolha produtos em Produtos ou cadastre os seus abaixo.</p>';
}
let LOOK = null;
function renderLooks() {
  const l = LOOK;
  $("#lk-save").hidden = !l;
  $("#lk-out").innerHTML = l ? `<h3>${esc(l.title)}</h3><ul>${l.items.map((i) => `<li><b>${esc(i.label)}:</b> ${i.name ? esc(i.name) + (i.why.length ? ` <small>(combina por: ${esc(i.why.join(", "))})</small>` : "") : "<span class=muted>Use o que você já tem.</span>"}<br><small>${esc(i.tip)}</small></li>`).join("")}</ul>${(l.occ === "encontro" || l.occ === "festa") && Math.random() < 0.5 ? `<p><em>${WINKS[Math.floor(Math.random() * WINKS.length)]}</em></p>` : ""}` : '<p class="empty">Toque em "Surpreenda-me" para ver uma ideia.</p>';
  $("#lk-saved").innerHTML = S.looks.length ? S.looks.map((k, i) => `<article class="card"><div class="b"><h3>${esc(k.name)}</h3><small>${esc(k.names.join(" + ") || "sem produtos")}</small><div class="row"><button data-del="${i}">Remover</button></div></div></article>`).join("") : '<p class="empty">Nenhum look salvo ainda.</p>';
}
const syncMine = () => S.mine.forEach((m) => { if (!PRODUCTS.some((p) => p.id === m.id)) PRODUCTS.push(m); });
$("#lk-go").onclick = () => { LOOK = makeLook($("#lk-occ").value, $("#lk-style").value || S.profile.paleta, score, PRODUCTS); renderLooks(); };
$("#lk-save").onclick = () => { if (!LOOK) return; S.looks.unshift({ name: LOOK.title + " · " + new Date().toLocaleDateString("pt-BR"), names: LOOK.items.filter((i) => i.name).map((i) => i.name) }); S.looks = S.looks.slice(0, 20); save(); renderLooks(); toast("Look salvo."); };
document.addEventListener("click", (e) => { const d = e.target.dataset?.del; if (d === undefined) return; S.looks.splice(+d, 1); save(); renderLooks(); });
document.addEventListener("change", (e) => {
  const k = e.target.dataset?.o; if (!k) return; const id = e.target.dataset.id, o = S.own[id]; if (!o) return;
  if (k === "price") { const v = num(e.target.value); if (Number.isNaN(v)) return toast("Use apenas números, como 49,90."); o.price = v; } else o[k] = e.target.value;
  save(); renderNec();
});
$("#mine").addEventListener("submit", (e) => {
  e.preventDefault(); const f = new FormData(e.target), err = $("#mine-err"), name = String(f.get("name")).trim(), price = num(f.get("price"));
  if (name.length < 2) { err.textContent = "Informe o nome do produto."; return; }
  if (Number.isNaN(price)) { err.textContent = "Preço inválido. Use números, como 49,90."; return; }
  err.textContent = ""; const id = "m" + Date.now();
  const p = { id, name, brand: String(f.get("brand")).trim() || "Sem marca", cat: f.get("cat"), origin: "minha", tier: "", acab: "natural", cob: "média", pele: "todas", tags: [], price, url: null, conf: "a confirmar", tons: String(f.get("tom")).trim() || "Informado por você.", pitch: "Cadastrado por você." };
  S.mine.push(p); PRODUCTS.push(p); S.own[id] = { status: f.get("status"), price, tom: String(f.get("tom")).trim() }; save(); renderAll(); e.target.reset(); toast("Produto adicionado.");
});
let DP; addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); DP = e; $("#install").hidden = false; });
$("#install").onclick = async () => { if (DP) { DP.prompt(); await DP.userChoice; $("#install").hidden = true; } };
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
try { navigator.storage?.persist?.(); } catch {}
function renderAll() { syncMine(); renderNec(); renderLooks(); renderConsult(); tools(); renderProfile(); renderDiscover(); renderCatalog(); renderBrands(); renderFavs(); }

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const id = b.dataset.id, a = b.dataset.a;
  if (a === "own") { if (S.own[id]) delete S.own[id]; else S.own[id] = { status: "quero" }; save(); renderAll(); return; }
  if (a === "fav") S.favs = S.favs.includes(id) ? S.favs.filter((x) => x !== id) : [...S.favs, id]; else if (S.likes[id] === a) delete S.likes[id]; else S.likes[id] = a;
  save(); renderAll();
  if (a === "fav" && S.favs.includes(id) && PRODUCTS.find((p) => p.id === id)?.iury) toast(WINKS[Math.floor(Math.random() * WINKS.length)]);
});
const fillCats = () => { const v = $("#cat").value; $("#cat").innerHTML = '<option value="">Todas</option>' + [...new Set(PRODUCTS.map((p) => p.cat))].map((c) => `<option>${esc(c)}</option>`).join(""); $("#cat").value = v; $("#mine-cat").innerHTML = [...new Set(PRODUCTS.map((p) => p.cat))].map((c) => `<option>${esc(c)}</option>`).join(""); };
fillCats();
["#q", "#cat", "#sort"].forEach((s) => $(s).addEventListener("input", renderCatalog));
$("#save").onclick = () => { S.notes = $("#notes").value; save(); toast("Salvo."); };
$("#export").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" })); a.download = "meus-dados-eduarda.json"; a.click(); };
$("#reset").onclick = async () => { if (!confirm("Apagar todas as suas preferências, favoritos e notas?")) return; for (let i = PRODUCTS.length - 1; i >= 0; i--) if (PRODUCTS[i].origin === "minha") PRODUCTS.splice(i, 1); S = blank(); localStorage.removeItem(KEY); if (sb && user) await sb.from("beauty_profiles").delete().eq("user_id", user.id); $("#notes").value = ""; renderAll(); toast("Dados apagados."); };

S = local(); $("#notes").value = S.notes; renderAll();
initCloud().then(() => { fillCats(); $("#notes").value = S.notes; renderAll(); });

// Boas-vindas personalizadas (uma vez por navegador)
try {
  const w = $("#welcome");
  if (w && w.showModal && !localStorage.getItem("eduarda:welcome")) { w.showModal(); $("#enter").onclick = () => { localStorage.setItem("eduarda:welcome", "1"); w.close(); }; }
} catch { /* sem localStorage: segue sem a tela de boas-vindas */ }
