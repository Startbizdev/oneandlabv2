import { describe, expect, it } from 'vitest';
import { addressAreaLabel } from '@oneandlab/shared-utils';

describe('zone affichée sur le profil public', () => {
  it('nomme l’arrondissement à Paris, Marseille et Lyon sans la rue', () => {
    expect(addressAreaLabel('5 Rue de la Paix, 75002 Paris, France')).toBe('Paris 2e');
    expect(addressAreaLabel('13003 Marseille')).toBe('Marseille 3e');
    expect(addressAreaLabel('8 Rue Mercière, 69001 Lyon')).toBe('Lyon 1er');
  });

  it('garde code postal et ville ailleurs', () => {
    expect(addressAreaLabel('3 Avenue des Goums, 13400 Aubagne, France')).toBe('13400 Aubagne');
    expect(addressAreaLabel('75116 Paris')).toBe('75116 Paris');
  });

  it('se rabat sur la ville seule', () => {
    expect(addressAreaLabel('Marseille')).toBe('Marseille');
    expect(addressAreaLabel(null)).toBe('');
  });
});
