/**
 * Illustrations 3D des soins, livrées avec le web (`/images/care/<clé>.webp`) et le mobile
 * (`assets/care-art/<clé>.png`). Une catégorie sans illustration dédiée prend celle de son type.
 */
export const CARE_ARTWORK_KEYS = [
  'autre',
  'bilan-sanguin',
  'certificat-de-deces',
  'depistages-infections',
  'epilation-laser',
  'examen-des-selles',
  'examen-des-urines',
  'grossesse',
  'injection',
  'mon-bilan-prevention',
  'pansement-plaie',
  'perfusion',
  'prelevement-bacteriologique',
  'prise-de-sang',
  'retrait-de-points-agrafes',
  'soins-d-hygiene',
  'soins-de-stomie',
  'soins-infirmiers',
  'soins-palliatifs',
  'soins-respiratoires',
  'sonde-urinaire',
  'suivi-diabete',
  'suivi-post-hospitalisation',
  'surveillance-constante',
  'traitement',
  'vaccination',
] as const;

export type CareArtworkKey = (typeof CARE_ARTWORK_KEYS)[number];

/** Anciens libellés ou variantes encore présents dans des RDV historiques. */
const CARE_ARTWORK_ALIASES: Readonly<Record<string, CareArtworkKey>> = {
  'bilan-complet': 'bilan-sanguin',
  'bilan-de-prevention': 'mon-bilan-prevention',
  'injection-intramusculaire': 'injection',
  'injection-sous-cutanee': 'injection',
  pansement: 'pansement-plaie',
  'pansement-complexe': 'pansement-plaie',
  prelevement: 'prise-de-sang',
  'soins-de-plaies': 'pansement-plaie',
  surveillance: 'surveillance-constante',
  'toilette-soins-d-hygiene': 'soins-d-hygiene',
};

const KNOWN_KEYS: ReadonlySet<string> = new Set(CARE_ARTWORK_KEYS);

function isCareArtworkKey(value: string): value is CareArtworkKey {
  return KNOWN_KEYS.has(value);
}

export function careArtworkSlug(name: string | null | undefined): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function careArtworkKey(category: { name?: string | null; type?: string | null }): CareArtworkKey {
  const slug = careArtworkSlug(category.name);
  if (isCareArtworkKey(slug)) return slug;
  const alias = CARE_ARTWORK_ALIASES[slug];
  if (alias) return alias;
  return category.type === 'blood_test' ? 'prise-de-sang' : 'soins-infirmiers';
}

/** Chemin public web de l'illustration (servie par Nuxt depuis `frontend/public`). */
export function careArtworkWebPath(key: CareArtworkKey): string {
  return `/images/care/${key}.webp`;
}
