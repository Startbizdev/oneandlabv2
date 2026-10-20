import type { PharmacyCatalogItem, PharmacyPublicProfile } from '@oneandlab/shared-types';
import {
  catalogItemFromPharmacyProfile,
  initialModeForPharmacy,
  preselectedPharmacyIssue,
  sortWizardCatalog,
  visibleWizardCatalog,
} from '../pharmacy-preselection';

function pharmacy(id: string, patch: Partial<PharmacyCatalogItem> = {}): PharmacyCatalogItem {
  return {
    id,
    display_name: `Pharmacie ${id}`,
    emploi: 'Pharmacien',
    accepts_click_collect: true,
    accepts_home_delivery: true,
    click_collect_days: [],
    home_delivery_days: [],
    address: null,
    postal_code: '75001',
    ...patch,
  };
}

const NO_FAV = new Set<string>();
// 2026-10-19 est un lundi (jour ISO 1).
const MONDAY = '2026-10-19';

describe('sortWizardCatalog', () => {
  it('sans présélection : pharmacie du patient, favoris, puis alphabétique (comportement inchangé)', () => {
    const items = [pharmacy('c'), pharmacy('b'), pharmacy('a', { is_patient_pharmacy: true })];
    expect(sortWizardCatalog(items, new Set(['c']), null, 'click_collect').map((p) => p.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('place la pharmacie du QR en tête, avant celle du patient', () => {
    const qr = pharmacy('q');
    const items = [pharmacy('a', { is_patient_pharmacy: true }), qr];
    expect(sortWizardCatalog(items, NO_FAV, qr, 'click_collect').map((p) => p.id)).toEqual(['q', 'a']);
  });

  it('ajoute la pharmacie du QR absente du catalogue filtré, sans doublon', () => {
    const qr = pharmacy('q');
    expect(sortWizardCatalog([pharmacy('a')], NO_FAV, qr, 'click_collect').map((p) => p.id)).toEqual(['q', 'a']);
    expect(sortWizardCatalog([qr, pharmacy('a')], NO_FAV, qr, 'click_collect')).toHaveLength(2);
  });

  it('ne l’ajoute pas pour un mode qu’elle ne propose pas', () => {
    const qr = pharmacy('q', { accepts_home_delivery: false });
    expect(sortWizardCatalog([pharmacy('a')], NO_FAV, qr, 'home_delivery').map((p) => p.id)).toEqual(['a']);
  });
});

describe('visibleWizardCatalog', () => {
  const sorted = [pharmacy('q'), pharmacy('a', { is_patient_pharmacy: true }), pharmacy('z')];

  it('liste repliée : pharmacies du patient et pharmacie du QR', () => {
    expect(visibleWizardCatalog(sorted, false, 'q').map((p) => p.id)).toEqual(['q', 'a']);
  });

  it('sans présélection, seules les pharmacies du patient restent visibles', () => {
    expect(visibleWizardCatalog(sorted.slice(1), false, null).map((p) => p.id)).toEqual(['a']);
  });

  it('tout le catalogue quand on déplie ou sans pharmacie patient', () => {
    expect(visibleWizardCatalog(sorted, true, 'q')).toHaveLength(3);
    expect(visibleWizardCatalog([pharmacy('q'), pharmacy('z')], false, 'q')).toHaveLength(2);
  });
});

describe('preselectedPharmacyIssue', () => {
  it('aucune remarque quand le mode et la date conviennent', () => {
    expect(preselectedPharmacyIssue(pharmacy('q', { click_collect_days: [1] }), 'click_collect', MONDAY)).toBeNull();
    expect(preselectedPharmacyIssue(null, 'home_delivery', MONDAY)).toBeNull();
  });

  it('explique un mode non proposé', () => {
    const issue = preselectedPharmacyIssue(pharmacy('q', { accepts_home_delivery: false }), 'home_delivery', MONDAY);
    expect(issue).toEqual({ kind: 'mode', message: 'Pharmacie q ne propose pas la livraison à domicile.' });
  });

  it('explique une date hors des jours de la pharmacie', () => {
    const issue = preselectedPharmacyIssue(pharmacy('q', { home_delivery_days: [2, 3] }), 'home_delivery', MONDAY);
    expect(issue?.kind).toBe('date');
  });
});

describe('initialModeForPharmacy', () => {
  it('garde le mode courant s’il est proposé, sinon bascule', () => {
    expect(initialModeForPharmacy(pharmacy('q'), 'click_collect')).toBe('click_collect');
    expect(initialModeForPharmacy(pharmacy('q', { accepts_click_collect: false }), 'click_collect')).toBe(
      'home_delivery',
    );
  });
});

describe('catalogItemFromPharmacyProfile', () => {
  it('reprend les champs utiles du profil public', () => {
    const profile = {
      id: 'q',
      display_name: 'Pharmacie du Centre',
      emploi: 'Pharmacien',
      accepts_click_collect: true,
      accepts_home_delivery: false,
      click_collect_days: [1, 2],
      home_delivery_days: [],
      address: null,
      postal_code: '69001',
      profile_image_url: null,
    } as unknown as PharmacyPublicProfile;
    expect(catalogItemFromPharmacyProfile(profile)).toMatchObject({
      id: 'q',
      display_name: 'Pharmacie du Centre',
      accepts_home_delivery: false,
      click_collect_days: [1, 2],
      postal_code: '69001',
    });
  });
});
