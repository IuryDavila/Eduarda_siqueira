// Conversão entre o formato do app e as tabelas do Supabase, usada pelo app e pelo painel admin.
export const toRow = (p) => ({ slug: p.id, name: p.name, brand_name: p.brand, category: p.cat, origin: p.origin || null, tier: p.tier || null, finish: p.acab, coverage: p.cob, skin_type: p.pele, tags: p.tags || [], price: p.price ?? null, url: p.url || null, image_url: p.image || null, tons: p.tons || null, pitch: p.pitch || null, conf: p.conf || "a confirmar", iury: !!p.iury, active: p.active !== false, featured: !!p.featured });
export const fromRow = (r) => ({ id: r.slug || r.id, name: r.name, brand: r.brand_name || "", cat: r.category || "", origin: r.origin || "", tier: r.tier || "", acab: r.finish || "natural", cob: r.coverage || "média", pele: r.skin_type || "todas", tags: r.tags || [], price: r.price == null ? null : Number(r.price), url: r.url, image: r.image_url, tons: r.tons || "Confira a cartela de tons na página da marca.", pitch: r.pitch || "", conf: r.conf || "a confirmar", iury: !!r.iury, active: r.active !== false, featured: !!r.featured });
export const brandToRow = (b) => ({ name: b.name, origin: b.origin || null, tier: b.tier || null, style: b.style || null, why: b.why || null });
export async function loadRemote(sb) {
  const [p, b] = await Promise.all([sb.from("products").select("*"), sb.from("brands").select("*")]);
  if (p.error || b.error) throw new Error("falha ao ler catálogo");
  return { products: p.data.map(fromRow), brands: b.data.map((r) => ({ name: r.name, origin: r.origin || "", tier: r.tier || "", style: r.style || "", why: r.why || "" })) };
}
export function mergeRemote(PRODUCTS, BRANDS, rem) {
  for (const p of rem.products) { const i = PRODUCTS.findIndex((x) => x.id === p.id); if (!p.active) { if (i >= 0) PRODUCTS.splice(i, 1); } else if (i >= 0) PRODUCTS[i] = p; else PRODUCTS.push(p); }
  for (const b of rem.brands) { const i = BRANDS.findIndex((x) => x.name === b.name); if (i >= 0) BRANDS[i] = b; else BRANDS.push(b); }
}
