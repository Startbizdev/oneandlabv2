/** Offres infirmier Cary — alignées sur frontend/pages/nurse/abonnement/index.vue */

export const NURSE_IAP_PRODUCT_ID = 'cary.pro.monthly' as const;

export type NursePlanSlug = 'discovery' | 'nurse_pro';

export type NursePlanDefinition = {
  slug: NursePlanSlug;
  name: string;
  priceLabel: string;
  priceSuffix: string;
  tagline: string;
  features: string[];
  recommended?: boolean;
  productId?: string;
};

export const NURSE_PLANS: Record<NursePlanSlug, NursePlanDefinition> = {
  discovery: {
    slug: 'discovery',
    name: 'Découverte',
    priceLabel: '0 €',
    priceSuffix: '/mois',
    tagline: 'Gratuit pour découvrir la plateforme',
    features: [
      "Rayon d'intervention jusqu'à 20 km.",
      'Fiche professionnelle visible par les patients.',
      '10 rendez-vous par mois maximum (compteur remis à zéro le 1er de chaque mois).',
      'Tous les types de soins.',
    ],
  },
  nurse_pro: {
    slug: 'nurse_pro',
    name: 'Pro',
    priceLabel: '29 €',
    priceSuffix: '/mois',
    tagline: "30 jours d'essai gratuit",
    recommended: true,
    productId: NURSE_IAP_PRODUCT_ID,
    features: [
      "Rayon jusqu'à 100 km.",
      'Rendez-vous illimités.',
      'Tous les types de soins.',
      'Avis patients et réponses.',
      'Tableau de bord et statistiques.',
    ],
  },
};

export const NURSE_PLAN_LIST: NursePlanDefinition[] = [
  NURSE_PLANS.discovery,
  NURSE_PLANS.nurse_pro,
];
