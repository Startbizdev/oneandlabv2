import { describe, expect, it } from 'vitest';
import { bookingAddressAlreadyChosen } from '~/utils/booking-address-prefill';

describe('préremplissage de l’adresse du RDV (proche / profil)', () => {
  it('préremplit un tunnel encore vierge', () => {
    expect(bookingAddressAlreadyChosen(undefined)).toBe(false);
    expect(bookingAddressAlreadyChosen({})).toBe(false);
    expect(bookingAddressAlreadyChosen({ first_name: 'Léa', address: null })).toBe(false);
  });

  it('garde l’adresse choisie pour le RDV au retour sur l’étape ou à la reprise du brouillon', () => {
    expect(
      bookingAddressAlreadyChosen({ address: { label: '5 place du RDV, Nice', lat: 43.7, lng: 7.2 }, address_complement: '' }),
    ).toBe(true);
    expect(bookingAddressAlreadyChosen({ address: '5 place du RDV, Nice' })).toBe(true);
  });

  it('respecte une adresse volontairement effacée', () => {
    expect(bookingAddressAlreadyChosen({ address: null, address_complement: '' })).toBe(true);
  });
});
