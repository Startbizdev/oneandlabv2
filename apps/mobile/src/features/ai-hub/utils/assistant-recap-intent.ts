/** Cary annonce un récap interactif (carte + Valider). */
export function assistantSignalsRecap(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /r[eé]cap\b|recap\b|r[eé]capitulatif|recapitulatif|voici le r[eé]?cap|v[eé]rifi(ez|e).*?(dessous|ci-dessous|les d[eé]tails)|appuy(ez|er).*?(valider|confirmer)|confirmez|valider pour confirmer/iu.test(
    t,
  );
}
