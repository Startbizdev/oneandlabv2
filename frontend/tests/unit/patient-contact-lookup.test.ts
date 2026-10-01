import { describe, it, expect, vi } from 'vitest';
import { patientAdoptErrorMessage } from '@oneandlab/shared-api';
import { adoptStaffPatient, lookupPatientByContact } from '~/utils/patient-contact-lookup';
import { ApiHttpError, apiErrorMessage } from '~/utils/api';

describe('recherche puis adoption d’un dossier patient (wizard staff)', () => {
  it('renvoie le dossier réduit et le contact qui l’a trouvé', async () => {
    const apiFetch = vi.fn(async () => ({
      success: true,
      data: { id: 'p1', first_name: 'Ana', last_name: 'Diaz', birth_date: '1990-02-03', email: 'ana@test.fr' },
    }));
    const found = await lookupPatientByContact(apiFetch, 'ana@test.fr', '');
    expect(apiFetch).toHaveBeenCalledWith('/patients/lookup?email=ana%40test.fr', { method: 'GET' });
    expect(found).toEqual({
      patient: { id: 'p1', first_name: 'Ana', last_name: 'Diaz', birth_date: '1990-02-03' },
      contact: { email: 'ana@test.fr' },
    });
  });

  it('adopte avec le contact recherché et le consentement', async () => {
    const apiFetch = vi.fn(async () => ({ success: true }));
    await adoptStaffPatient(apiFetch, 'p1', { phone: '0612345678' }, true);
    expect(apiFetch).toHaveBeenCalledWith('/patients/adopt', {
      method: 'POST',
      body: { patient_id: 'p1', phone: '0612345678', patient_booking_consent: true },
    });
  });

  it('propage le refus serveur pour l’afficher selon le code', async () => {
    const apiFetch = vi.fn(async () => {
      throw new ApiHttpError('Accès refusé', 403, 'PATIENT_LOOKUP_MISMATCH');
    });
    const error = await adoptStaffPatient(apiFetch, 'p1', { email: 'a@b.fr' }, true).catch((e: unknown) => e);
    expect(apiErrorMessage(error, patientAdoptErrorMessage, 'x')).toMatch(/ne correspond plus/);
  });

  it('ApiHttpError transporte existing_patient_id du 409 EMAIL_ALREADY_USED', () => {
    const error = new ApiHttpError('E-mail déjà utilisé', 409, 'EMAIL_ALREADY_USED', 'p7');
    expect(error.existingPatientId).toBe('p7');
  });
});
