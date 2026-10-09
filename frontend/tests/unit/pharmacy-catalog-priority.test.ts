import { describe, expect, it } from 'vitest';
import { splitPharmacyCatalog, withOwnPharmacyOption, type PharmacyCatalogRow } from '~/utils/pharmacy-catalog-priority';

function row(id: string, extra: Partial<PharmacyCatalogRow> = {}): PharmacyCatalogRow {
  return {
    id,
    display_name: id,
    emploi: 'Pharmacien',
    accepts_click_collect: true,
    accepts_home_delivery: false,
    click_collect_days: [1],
    home_delivery_days: [],
    address: null,
    postal_code: '75001',
    ...extra,
  };
}

describe('catalogue pharmacie prioritaire', () => {
  it('met la pharmacie du patient avant les autres', () => {
    const split = splitPharmacyCatalog(
      [row('a'), row('b', { is_patient_pharmacy: true }), row('c')],
      '',
    );
    expect(split.preferred.map((item) => item.id)).toEqual(['b']);
    expect(split.others.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('garde la pharmacie du compte même hors catalogue', () => {
    const items = withOwnPharmacyOption([row('other')], 'own');
    const split = splitPharmacyCatalog(items, 'own');
    expect(split.preferred.map((item) => item.id)).toEqual(['own']);
    expect(split.others.map((item) => item.id)).toEqual(['other']);
  });
});
