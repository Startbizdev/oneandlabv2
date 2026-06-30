/** Carte accent-insensible : chaque index de `flat` pointe vers l’index du caractère dans `label`. */
function buildFlatCharMap(label: string): { flat: string; origIndex: number[] } {
  const origIndex: number[] = [];
  let flat = '';
  for (let i = 0; i < label.length; i++) {
    const ch = label[i]!;
    const base = ch
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    if (base === '') continue;
    for (let j = 0; j < base.length; j++) {
      flat += base[j]!;
      origIndex.push(i);
    }
  }
  return { flat, origIndex };
}

/**
 * Découpe `label` en segments pour affichage : la première occurrence de `query` (sans tenir compte des accents / casse) est en emphase.
 */
export function accentInsensitiveHighlightSegments(
  label: string,
  query: string,
): { text: string; bold: boolean }[] {
  const q = query
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (!q) return [{ text: label, bold: false }];

  const { flat, origIndex } = buildFlatCharMap(label);
  const qi = flat.indexOf(q);
  if (qi < 0) return [{ text: label, bold: false }];

  const qEnd = qi + q.length - 1;
  const startOrig = origIndex[qi]!;
  const endOrig = origIndex[Math.min(qEnd, origIndex.length - 1)]!;
  const before = label.slice(0, startOrig);
  const mid = label.slice(startOrig, endOrig + 1);
  const after = label.slice(endOrig + 1);

  const out: { text: string; bold: boolean }[] = [];
  if (before) out.push({ text: before, bold: false });
  if (mid) out.push({ text: mid, bold: true });
  if (after) out.push({ text: after, bold: false });
  return out.length ? out : [{ text: label, bold: false }];
}

export function accentInsensitiveContains(haystack: string, needle: string): boolean {
  const h = haystack
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  const n = needle
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (!n) return true;
  return h.includes(n);
}
