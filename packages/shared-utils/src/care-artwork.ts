/**
 * Illustrations 3D des soins (une par catégorie), livrées avec le web (`/images/care/<clé>.webp`) et le
 * mobile (`assets/care-art/<clé>.png`). Une catégorie inconnue prend celle de son type.
 */
export const CARE_ARTWORK_KEYS = [
  'aide-aux-repas',
  'autre',
  'bilan-d-anesthesie',
  'bilan-de-coagulation',
  'bilan-hepatique',
  'bilan-inflammatoire',
  'bilan-lipidique',
  'bilan-martial',
  'bilan-pre-operatoire',
  'bilan-renal',
  'bilan-sanguin',
  'bilan-thyroidien',
  'bilan-vitaminique',
  'certificat-de-deces',
  'chimiotherapie-a-domicile',
  'cholesterol',
  'crp',
  'depistage-vih-hepatites',
  'depistages-infections',
  'epilation-laser',
  'examen-des-selles',
  'examen-des-urines',
  'fer-ferritine',
  'garde-surveillance-nuit',
  'glycemie',
  'glycemie-a-jeun',
  'grossesse',
  'hba1c',
  'hormones',
  'injection',
  'injection-intramusculaire',
  'injection-sous-cutanee',
  'marqueurs-tumoraux',
  'mesure-tension-glycemie',
  'mon-bilan-prevention',
  'nfs',
  'pansement-complexe',
  'pansement-plaie',
  'perfusion',
  'pose-de-catheter',
  'prelevement-bacteriologique',
  'prelevement-urinaire',
  'prise-de-sang',
  'reeducation',
  'retrait-de-points-agrafes',
  'serologie',
  'soins-a-la-personne',
  'soins-d-hygiene',
  'soins-de-plaies',
  'soins-de-sonde',
  'soins-de-stomie',
  'soins-infirmiers',
  'soins-palliatifs',
  'soins-post-operatoires',
  'soins-respiratoires',
  'sonde-urinaire',
  'suivi-diabete',
  'suivi-post-hospitalisation',
  'surveillance-constante',
  'traitement',
  'triglycerides',
  'vaccination',
  'vitamines',
] as const;

export type CareArtworkKey = (typeof CARE_ARTWORK_KEYS)[number];

/** Anciens libellés ou variantes encore présents dans des RDV historiques. */
const CARE_ARTWORK_ALIASES: Readonly<Record<string, CareArtworkKey>> = {
  'bilan-complet': 'bilan-sanguin',
  'bilan-de-prevention': 'mon-bilan-prevention',
  pansement: 'pansement-plaie',
  prelevement: 'prise-de-sang',
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
