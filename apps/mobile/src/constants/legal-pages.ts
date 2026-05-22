export type LegalPageDef = {
  slug: string;
  label: string;
  path: string;
  description?: string;
};

/** Pages légales publiques du site Cary (alignées footer web). */
export const LEGAL_PAGES: LegalPageDef[] = [
  {
    slug: 'mentions-legales',
    label: 'Mentions légales',
    path: '/mentions-legales',
    description: 'Éditeur, hébergement, propriété intellectuelle',
  },
  {
    slug: 'confidentialite',
    label: 'Politique de confidentialité',
    path: '/politique-confidentialite',
    description: 'Données personnelles et RGPD',
  },
  {
    slug: 'cgv',
    label: "Conditions d'utilisation",
    path: '/cgv',
    description: 'CGV et conditions de service',
  },
  {
    slug: 'contact',
    label: 'Contact',
    path: '/contact',
    description: 'Nous contacter',
  },
];
