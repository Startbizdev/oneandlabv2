import type { Appointment } from '@oneandlab/shared-types';
import { addressLineWithDistrict, frenchCityDistrictLabel } from '@oneandlab/shared-utils';
import { buildRdvListCardAccessibilityLabel } from '../../features/appointments/components/rdv-list-card-accessibility';
import { formatLocationSummary } from '../../features/nurse-passage/utils/passage-form-summaries';

describe('arrondissement dans l’adresse du passage', () => {
  it('nomme la ville et l’arrondissement à Marseille, Lyon et Paris', () => {
    expect(frenchCityDistrictLabel('13003')).toBe('Marseille 3e');
    expect(frenchCityDistrictLabel('13001')).toBe('Marseille 1er');
    expect(frenchCityDistrictLabel('69009')).toBe('Lyon 9e');
    expect(frenchCityDistrictLabel('75015')).toBe('Paris 15e');
  });

  it('ignore les codes postaux sans arrondissement', () => {
    expect(frenchCityDistrictLabel('13017')).toBeNull();
    expect(frenchCityDistrictLabel('13400')).toBeNull();
    expect(frenchCityDistrictLabel('69100')).toBeNull();
    expect(frenchCityDistrictLabel('75116')).toBeNull();
  });

  it('remplace « code postal + ville » par l’arrondissement en gardant le numéro de rue', () => {
    expect(addressLineWithDistrict('12 Rue Bouès, 13003 Marseille, France')).toBe('12 Rue Bouès, Marseille 3e');
    expect(addressLineWithDistrict('12 Rue Bouès 13003 Marseille')).toBe('12 Rue Bouès, Marseille 3e');
    expect(addressLineWithDistrict('Résidence Les Lilas, 4 Rue Paul Claudel, 13004 Marseille')).toBe(
      'Résidence Les Lilas, 4 Rue Paul Claudel, Marseille 4e',
    );
  });

  it('garde le libellé ailleurs, sans le pays', () => {
    expect(addressLineWithDistrict('3 Avenue des Goums, 13400 Aubagne, France')).toBe('3 Avenue des Goums, 13400 Aubagne');
    expect(addressLineWithDistrict('')).toBe('');
    expect(addressLineWithDistrict(null)).toBe('');
  });

  it('affiche le lieu du passage avec l’arrondissement', () => {
    expect(formatLocationSummary(true, '12 Rue Bouès, 13003 Marseille')).toBe('À domicile · 12 Rue Bouès, Marseille 3e');
    expect(formatLocationSummary(true, null)).toBe('À domicile');
  });
});

describe('lecteur d’écran sur la carte agenda', () => {
  const base: Appointment = {
    id: 'apt-1',
    type: 'nursing',
    status: 'confirmed',
    form_data: {},
    scheduled_at: '2030-01-07 08:00:00',
    created_at: '2030-01-01 09:00:00',
  };

  it('annonce « Passage » pour un passage infirmier', () => {
    const label = buildRdvListCardAccessibilityLabel({ ...base, passage_source: 'nurse_passage' }, 'nurse', 'confirmed');
    expect(label.startsWith('Passage, ')).toBe(true);
  });

  it('garde « Rendez-vous » pour un rendez-vous classique', () => {
    expect(buildRdvListCardAccessibilityLabel(base, 'nurse', 'confirmed').startsWith('Rendez-vous, ')).toBe(true);
  });
});
