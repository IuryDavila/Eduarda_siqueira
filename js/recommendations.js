// Consultoria de base e corretivo. Nunca afirma compatibilidade exata: informa pontos em comum e o que falta confirmar.
const ok = (v) => v && v !== "não sei";
export const UNDERTONE = {
  quente: "Tons com fundo dourado, amarelado ou pêssego tendem a combinar. Procure na cartela letras ou nomes como W, warm, dourado ou pêssego.",
  frio: "Tons com fundo rosado ou avermelhado tendem a combinar. Procure C, cool, rosado.",
  neutro: "Tons que misturam os dois fundos tendem a combinar. Procure N, neutral, neutro.",
  "não sei": "Faça o teste das veias (verdes: quente; azuladas: frio; as duas: neutro), das joias (ouro favorece o quente, prata o frio) e do branco puro contra o off-white. São pistas, não diagnóstico.",
};
export const CONCEALER_TIPS = ["Para olheiras: um tom ou meio tom mais claro que a base, só na região.", "Para espinhas e manchas: o mesmo tom da base, aplicado por cima dela.", "Para olheiras arroxeadas ou azuladas, um corretor com fundo pêssego neutraliza melhor; para vermelhidão, um com fundo esverdeado.", "Sele com pouco pó para não marcar linhas finas."];
export function consult(f, occ, products) {
  const want = { pele: f.pele, acab: f.acab === "luminoso" ? "glow" : f.acab, cob: f.cob, tier: f.tier };
  const missing = [["tom", "tom de pele"], ["subtom", "subtom"], ["pele", "tipo de pele"], ["acab", "acabamento"], ["cob", "cobertura"]].filter(([k]) => !ok(f[k])).map((x) => x[1]);
  const run = (cat) => products.filter((p) => p.cat === cat).map((p) => {
    const hits = [], gaps = [];
    const chk = (cond, yes, no) => (cond ? hits.push(yes) : gaps.push(no));
    if (ok(want.pele)) chk(p.pele === want.pele || p.pele === "todas", "tipo de pele", "indicação para pele " + p.pele);
    if (ok(want.acab)) chk(p.acab === want.acab, "acabamento " + p.acab, "acabamento " + p.acab + " (você prefere " + want.acab + ")");
    if (ok(want.cob)) chk(p.cob === want.cob, "cobertura " + p.cob, "cobertura " + p.cob);
    if (ok(want.tier)) chk(p.tier === want.tier, "faixa de preço", "faixa " + p.tier);
    if ((occ === "festa" || occ === "evento") && p.cob === "alta") hits.push("boa para ocasião longa");
    if (occ === "dia" && (p.cob === "leve" || p.cob === "média")) hits.push("leve para o dia");
    const known = ok(f.tom) && ok(f.subtom);
    const conf = hits.length >= 4 && p.conf === "verificado" && known ? "alta" : hits.length >= 3 ? "média" : "baixa";
    return { p, hits, gaps, conf, s: hits.length };
  }).sort((a, b) => b.s - a.s).slice(0, cat === "Bases" ? 4 : 2);
  return { missing, bases: run("Bases"), concealers: run("Corretivos"), undertone: UNDERTONE[f.subtom] || UNDERTONE["não sei"] };
}
