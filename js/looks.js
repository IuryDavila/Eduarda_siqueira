// Gerador de looks: sugestões estéticas, nunca regras. Usa o perfil e o que ela já rejeitou.
export const OCC = {
  dia: { name: "Leve como um dia bom", pref: { cob: ["leve", "média"], acab: ["natural", "glow"] } },
  trabalho: { name: "Pronta para a reunião", pref: { acab: ["natural", "matte"], cob: ["média"] } },
  encontro: { name: "Romântica e delicada", pref: { acab: ["glow", "natural"], tags: ["rosados"] } },
  festa: { name: "Olhar marcante, pele de festa", pref: { cob: ["alta"], acab: ["matte", "glow"] } },
  evento: { name: "Elegante para a noite", pref: { tier: ["premium"], cob: ["média", "alta"], acab: ["natural", "matte"] } },
};
const STEPS = [
  [["Bases"], "Pele", "Comece pelo centro do rosto e esfume para fora."],
  [["Corretivos"], "Olheiras", "Só onde precisa, com pouco produto."],
  [["Blushes"], "Bochechas", "Sorria e aplique nas maçãs, esfumando em direção às têmporas."],
  [["Batons", "Glosses"], "Lábios", "Comece pelo centro e esfume para as bordas."],
  [["Sombras"], "Olhos", "Cor suave na pálpebra. Intensidade só se bater a vontade."],
  [["Delineadores"], "Delineado", "Comece pelo canto externo e vá ligando com traços curtos."],
  [["Máscaras de cílios"], "Cílios", "Zigue-zague da raiz às pontas."],
  [["Produtos para sobrancelhas"], "Sobrancelhas", "Preencha com traços leves, só onde houver falhas."],
  [["Fixadores"], "Finalização", "Borrife a uns 20 cm do rosto."],
];
const bonus = (p, pref) => (pref.cob?.includes(p.cob) ? 1 : 0) + (pref.acab?.includes(p.acab) ? 1 : 0) + (pref.tier?.includes(p.tier) ? 1 : 0) + (pref.tags?.some((t) => p.tags.includes(t)) ? 1 : 0);
export function makeLook(occ, style, scoreFn, products) {
  const o = OCC[occ] || OCC.dia;
  const skip = { dia: ["Delineado"], trabalho: ["Delineado"] }[occ] || [];
  const items = STEPS.filter((s) => !skip.includes(s[1])).map(([cats, label, tip]) => {
    const c = products.filter((p) => cats.includes(p.cat)).map((p) => { const r = scoreFn(p); return { p, r, k: r.s + bonus(p, o.pref) + (style && p.tags.includes(style) ? 1 : 0) + Math.random() * 1.5 }; }).filter((x) => x.r.s > -99).sort((a, b) => b.k - a.k)[0];
    return { label, tip, id: c?.p.id || null, name: c ? c.p.brand + " · " + c.p.name : null, why: c ? c.r.why : [] };
  });
  return { title: o.name, occ, items };
}
