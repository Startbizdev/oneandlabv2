import type { PharmacyOrderStatus } from '@oneandlab/shared-types';

export const PHARMACY_ORDER_STATUS_LABELS: Record<PharmacyOrderStatus, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  refusee: 'Refusée',
  complement_demande: 'Complément demandé',
  annulee: 'Annulée',
};

export const PHARMACY_FULFILLMENT_LABELS = {
  click_collect: 'Click & collect',
  home_delivery: 'Livraison à domicile',
} as const;
