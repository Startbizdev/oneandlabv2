import { describe, it, expect } from '@jest/globals';
import { careArtworkKey } from '@oneandlab/shared-utils';
import { careSourceFromCatalog } from '../../features/categories/utils/care-source';

describe('careArtworkKey (illustration mobile d’un soin)', () => {
  it('donne à chaque catégorie réelle sa propre illustration', () => {
    expect(careArtworkKey({ name: 'Garde / surveillance nuit', type: 'nursing' })).toBe('garde-surveillance-nuit');
    expect(careArtworkKey({ name: 'Fer / Ferritine', type: 'blood_test' })).toBe('fer-ferritine');
    expect(careArtworkKey({ name: 'Dépistage (VIH, hépatites)', type: 'blood_test' })).toBe('depistage-vih-hepatites');
    expect(careArtworkKey({ name: 'Injection sous-cutanée', type: 'nursing' })).toBe('injection-sous-cutanee');
  });

  it('ramène les anciens libellés vers leur illustration', () => {
    expect(careArtworkKey({ name: "Toilette / soins d'hygiène", type: 'nursing' })).toBe('soins-d-hygiene');
    expect(careArtworkKey({ name: 'Bilan complet', type: 'blood_test' })).toBe('bilan-sanguin');
  });

  it('ne prend le visuel du type que pour une catégorie inconnue', () => {
    expect(careArtworkKey({ name: 'Analyse inconnue', type: 'blood_test' })).toBe('prise-de-sang');
    expect(careArtworkKey({ name: 'Soin inconnu', type: 'nursing' })).toBe('soins-infirmiers');
  });
});

describe('careSourceFromCatalog', () => {
  const categories = [{ id: 'c1', name: 'Vaccination' }];

  it('donne la priorité au nom de la catégorie du catalogue sur le libellé du RDV', () => {
    const care = careSourceFromCatalog({ categoryId: 'c1', name: 'Vaccin grippe' }, 'nursing', categories);
    expect(care).toEqual({ name: 'Vaccination', type: 'nursing' });
    expect(careArtworkKey(care)).toBe('vaccination');
  });

  it('garde le libellé du RDV quand la catégorie est absente du catalogue', () => {
    expect(careSourceFromCatalog({ categoryId: 'inconnu', name: 'Pansement' }, 'nursing', categories)).toEqual({
      name: 'Pansement',
      type: 'nursing',
    });
    expect(careSourceFromCatalog({ categoryId: null, name: 'NFS' }, 'blood_test', undefined)).toEqual({
      name: 'NFS',
      type: 'blood_test',
    });
  });

  it("transmet l'image importée par l'admin pour qu'elle remplace l'illustration", () => {
    const custom = [{ id: 'c2', name: 'Vaccination', image_url: '/api/categories/care-image?name=c2.png' }];
    expect(careSourceFromCatalog({ categoryId: 'c2', name: 'Vaccin' }, 'nursing', custom).image_url).toBe(
      '/api/categories/care-image?name=c2.png',
    );
  });
});
