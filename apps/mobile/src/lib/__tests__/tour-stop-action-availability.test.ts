import type { NurseTourStop } from '@/features/tournee-nurse/api/nurse-tour.service';
import { tourStopActionAvailability } from '@/features/tournee-nurse/utils/tour-stop-action-availability';

function stop(overrides: Partial<NurseTourStop>): NurseTourStop {
  return {
    stop_id: 's1',
    appointment_id: 'a1',
    position: 1,
    visit_status: 'todo',
    patient_name: 'Jean Patiente',
    category_name: 'Pansement',
    status: 'accepted',
    address_line: '12 Rue Paradis',
    distance_km_from_prev: 0,
    drive_min_from_prev: 0,
    ...overrides,
  };
}

describe('tourStopActionAvailability', () => {
  it('allows managing the absence of the account holder', () => {
    expect(tourStopActionAvailability(stop({ patient_id: 'alice' })).manageAbsence).toBe(true);
  });

  it('allows managing the absence of a relative that has its own dossier', () => {
    const relativeStop = stop({ patient_id: 'alice', relative_id: 'r1', relative_profile_id: 'jean' });
    expect(tourStopActionAvailability(relativeStop).manageAbsence).toBe(true);
  });

  it('never manages a relative absence on the account holder when the relative has no dossier', () => {
    const relativeStop = stop({ patient_id: 'alice', relative_id: 'r1', relative_profile_id: null });
    expect(tourStopActionAvailability(relativeStop).manageAbsence).toBe(false);
  });
});
