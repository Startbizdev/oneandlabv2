import type { Appointment } from '@oneandlab/shared-types';
import { offerAddressLine, offerVisitDateLabels } from '../offer-appointment-display';

function apt(id: string, scheduledAt: string, extra: Partial<Appointment> = {}): Appointment {
  return { id, status: 'pending', type: 'nursing', scheduled_at: scheduledAt, ...extra } as Appointment;
}

describe('adresse de l’offre (avant acceptation)', () => {
  it('ne répète pas le code postal quand l’adresse n’a pas de virgule', () => {
    expect(offerAddressLine(apt('a', '2026-10-23 08:00:00', { address: '10 Rue de Rome 13001 Marseille' }))).toBe(
      'Rue de Rome 13001 Marseille',
    );
  });

  it('garde le format habituel avec virgule', () => {
    expect(offerAddressLine(apt('a', '2026-10-23 08:00:00', { address: '10 Rue de Rome, 13001 Marseille' }))).toBe(
      'Rue de Rome 13001 Marseille',
    );
  });
});

describe('dates des passages d’une offre', () => {
  it('liste chaque passage du lot, du plus tôt au plus tard', () => {
    const labels = offerVisitDateLabels(apt('b', '2026-10-28 11:00:00'), [
      apt('b', '2026-10-28 11:00:00'),
      apt('a', '2026-10-26 10:00:00'),
    ]);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toMatch(/^Lundi 26 octobre 2026/);
    expect(labels[1]).toMatch(/^Mercredi 28 octobre 2026/);
  });

  it('inclut les passages connus seulement par leur date (frères du lot)', () => {
    const primary = apt('a', '2026-10-24 09:00:00', {
      batch_siblings: [{ id: 'b', status: 'pending', scheduled_at: '2026-10-23 08:00:00' }],
    } as Partial<Appointment>);
    const labels = offerVisitDateLabels(primary, [primary]);
    expect(labels.map((l) => l.split(' ')[0])).toEqual(['Vendredi', 'Samedi']);
  });

  it('une offre seule n’a qu’une date', () => {
    expect(offerVisitDateLabels(apt('a', '2026-10-24 09:00:00'), [])).toHaveLength(1);
  });
});
