import { PHARMACY_ORDER_STATUSES } from '@oneandlab/shared-types';
import {
  formatPharmacyDesiredDate,
  pharmacyOrderOrderedByLabel,
  pharmacyOrderStatusBadgeVariant,
} from '../../features/pharmacy-orders/utils/order-display';

describe('formatPharmacyDesiredDate', () => {
  it('affiche la date souhaitée en français', () => {
    expect(formatPharmacyDesiredDate('2026-10-03')).toBe('3 oct. 2026');
  });

  it('conserve la valeur brute si elle est illisible', () => {
    expect(formatPharmacyDesiredDate('bientôt')).toBe('bientôt');
  });
});

describe('pharmacyOrderStatusBadgeVariant', () => {
  it('distingue à traiter, en cours, terminé, refusé et annulé', () => {
    expect(pharmacyOrderStatusBadgeVariant('en_attente')).toBe('warning');
    expect(pharmacyOrderStatusBadgeVariant('complement_demande')).toBe('warning');
    expect(pharmacyOrderStatusBadgeVariant('acceptee')).toBe('primary');
    expect(pharmacyOrderStatusBadgeVariant('en_cours')).toBe('primary');
    expect(pharmacyOrderStatusBadgeVariant('terminee')).toBe('success');
    expect(pharmacyOrderStatusBadgeVariant('refusee')).toBe('error');
    expect(pharmacyOrderStatusBadgeVariant('annulee')).toBe('neutral');
  });

  it('couvre chaque statut du contrat partagé', () => {
    for (const status of PHARMACY_ORDER_STATUSES) {
      expect(['primary', 'success', 'error', 'warning', 'neutral']).toContain(
        pharmacyOrderStatusBadgeVariant(status),
      );
    }
  });
});

describe('pharmacyOrderOrderedByLabel — vue officine', () => {
  it('nomme le demandeur avec son métier pour la pharmacie', () => {
    expect(
      pharmacyOrderOrderedByLabel(
        { requester_id: 'n1', patient_id: 'p1', requester_role: 'nurse', requester_display_name: 'Léa Martin' },
        null,
        { pharmacyView: true },
      ),
    ).toBe('Infirmier · Léa Martin');
  });

  it('ne nomme pas le demandeur quand le patient a commandé lui-même', () => {
    expect(
      pharmacyOrderOrderedByLabel(
        { requester_id: 'p1', patient_id: 'p1', requester_role: 'patient', requester_display_name: 'Paul Durand' },
        null,
        { pharmacyView: true },
      ),
    ).toBeNull();
  });
});
