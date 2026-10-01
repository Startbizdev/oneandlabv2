/** N° de sécurité sociale (NIR) : 13 caractères + clé de 2 chiffres, département corse « 2A » / « 2B ». */
const NIR_LENGTH = 15;
const NIR_GROUPS = [1, 2, 2, 2, 3, 3, 2] as const;
const NIR_PATTERN = /^[1-478]\d{4}(?:\d{2}|2A|2B)\d{8}$/;

/** Retire espaces et séparateurs, met « 2a » en majuscules, tronque à 15 caractères. */
export function normalizeNir(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9AB]/g, '').slice(0, NIR_LENGTH);
}

function groupNir(chars: string): string {
  const parts: string[] = [];
  let index = 0;
  for (const size of NIR_GROUPS) {
    if (index >= chars.length) break;
    parts.push(chars.slice(index, index + size));
    index += size;
  }
  return parts.join(' ');
}

/** « 185057800608436 » → « 1 85 05 78 006 084 36 » (accepte une saisie partielle). */
export function formatNir(raw: string): string {
  return groupNir(normalizeNir(raw));
}

/** Masque tout sauf les 2 derniers caractères, en gardant le découpage. */
export function maskNir(raw: string): string {
  const value = normalizeNir(raw);
  if (!value) return '';
  const visibleFrom = Math.max(0, value.length - 2);
  const masked = value
    .split('')
    .map((char, index) => (index < visibleFrom ? '•' : char))
    .join('');
  return groupNir(masked);
}

/** Message d'erreur si le NIR saisi est incomplet ou si sa clé ne correspond pas ; `null` si valide ou vide. */
export function validateNir(raw: string): string | null {
  const value = normalizeNir(raw);
  if (!value) return null;
  if (value.length < NIR_LENGTH) return 'Le numéro doit comporter 15 caractères (clé comprise).';
  if (!NIR_PATTERN.test(value)) return 'Format de numéro de sécurité sociale invalide.';
  const body = value.slice(0, 13).replace('2A', '19').replace('2B', '18');
  const key = Number(value.slice(13));
  const expected = 97 - (Number(body) % 97);
  if (key !== expected) return 'La clé (2 derniers chiffres) ne correspond pas au numéro.';
  return null;
}
