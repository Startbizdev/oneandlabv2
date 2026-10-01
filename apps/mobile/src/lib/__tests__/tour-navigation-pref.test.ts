import { QueryClient } from '@tanstack/react-query';
import {
  cachedNavAppPrefForRole,
  cachedNurseNavAppPref,
  navAppLabel,
} from '../../features/tournee-nurse/utils/tour-navigation';

const clients: QueryClient[] = [];

function newClient(): QueryClient {
  const qc = new QueryClient();
  clients.push(qc);
  return qc;
}

afterEach(() => {
  for (const qc of clients.splice(0)) qc.clear();
});

function tour(navAppPref: string, stops: Array<{ stop_id: string; appointment_id: string }>) {
  return { date: '2026-10-01', plan: { id: 'p', nav_app_pref: navAppPref }, stops };
}

describe('nav_app_pref per role', () => {
  it('reads the nurse tour containing the appointment, else the first cached tour', () => {
    const qc = newClient();
    qc.setQueryData(['nurse-tour', '2026-10-01'], tour('google_maps', [{ stop_id: 's1', appointment_id: 'a1' }]));
    qc.setQueryData(['nurse-tour', '2026-10-02'], tour('apple_maps', [{ stop_id: 's2', appointment_id: 'a2' }]));
    expect(cachedNavAppPrefForRole(qc, 'nurse', 'a2')).toBe('apple_maps');
    expect(cachedNurseNavAppPref(qc, 's2')).toBe('apple_maps');
    expect(cachedNavAppPrefForRole(qc, 'nurse', 'unknown')).toBe('google_maps');
  });

  it('reads the préleveur tour cache', () => {
    const qc = newClient();
    qc.setQueryData(['preleveur-tour', '2026-10-01'], tour('google_maps', [{ stop_id: 's1', appointment_id: 'a1' }]));
    expect(cachedNavAppPrefForRole(qc, 'preleveur', 'a1')).toBe('google_maps');
  });

  it('falls back to the column default when no tour is cached', () => {
    expect(cachedNavAppPrefForRole(newClient(), 'nurse', 'a1')).toBe('waze');
  });

  it('returns null for roles without a tour plan', () => {
    const qc = newClient();
    qc.setQueryData(['nurse-tour', '2026-10-01'], tour('google_maps', []));
    for (const role of ['patient', 'pro', 'lab', undefined]) {
      expect(cachedNavAppPrefForRole(qc, role, 'a1')).toBeNull();
    }
  });

  it('labels the navigation app', () => {
    expect(navAppLabel('waze')).toBe('Waze');
    expect(navAppLabel('google_maps')).toBe('Google Maps');
    expect(navAppLabel('apple_maps')).toBe('Plans');
  });
});
