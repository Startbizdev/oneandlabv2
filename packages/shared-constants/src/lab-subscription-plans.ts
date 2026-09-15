/** Public presentation of the existing laboratory offers; billing remains server-authoritative. */
export const LAB_PLAN_LIST = [
  {
    slug: 'lab_starter', name: 'Starter', priceLabel: '49 €',
    tagline: 'Pour organiser les prélèvements d’une petite équipe.',
    features: ['Jusqu’à 2 préleveurs', 'Gestion et attribution des rendez-vous', 'Calendrier partagé', 'Statistiques essentielles'],
  },
  {
    slug: 'lab_pro', name: 'Pro', priceLabel: '129 €',
    tagline: 'Pour coordonner plusieurs équipes et développer votre activité.',
    features: ['Préleveurs illimités', 'Sous-comptes laboratoire illimités', 'Rendez-vous et calendrier partagé', 'Statistiques complètes', 'Avis et fiche laboratoire'],
  },
] as const;
