import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUser } from '@/features/profile/api/profile.service';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { resolvePatientAddressForRdvForm } from '@/utils/patient-address-rdv';
import { PatientSelection } from '../utils/patient-selection';

type Address = Awaited<ReturnType<typeof resolvePatientAddressForRdvForm>>;

/** A patient and their address are applied together, only for the latest selection. */
export function useSelectedPatient(apply: (patient: PatientRow, address: Address) => void, clear: () => void) {
  const callbacks = useRef({ apply, clear });
  callbacks.current = { apply, clear };
  const selectedId = useRef('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const selectionRef = useRef<PatientSelection<PatientRow, Address> | null>(null);
  if (!selectionRef.current) {
    selectionRef.current = new PatientSelection({
      fetch: async id => {
        const res = await fetchUser(id);
        if (!res.success || !res.data || res.data.id !== id) throw new Error('Dossier indisponible');
        return res.data as PatientRow;
      },
      address: patient => resolvePatientAddressForRdvForm(patient.address),
      clear: () => callbacks.current.clear(),
      apply: (patient, address) => callbacks.current.apply(patient, address),
      state: (loading, error) => { setLoading(loading); setError(error); },
    });
  }
  const selection = selectionRef.current;

  const load = useCallback(async (id: string) => {
    selectedId.current = id;
    await selection.load(id);
  }, [selection]);
  const reset = useCallback(() => {
    selectedId.current = '';
    selection.reset();
  }, [selection]);
  const retry = useCallback(() => { if (selectedId.current) void load(selectedId.current); }, [load]);
  useEffect(() => () => { selection.invalidate(); }, [selection]);
  return { load, reset, retry, loading, error };
}
