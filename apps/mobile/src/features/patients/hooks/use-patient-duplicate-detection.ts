import { useCallback, useEffect, useRef, useState } from 'react';
import type { PatientLookupResult } from '@oneandlab/shared-api';
import { lookupPatientByContact } from '@/features/patients/api/patient-lookup.service';

function suppressKey(email: string, phone: string, patientId: string): string {
  return `${email.trim()}|${phone.trim()}|${patientId}`;
}

/**
 * Détecte un patient existant par e-mail ou téléphone (debounce 450 ms).
 * `duplicate` garde le contact qui a trouvé le dossier : il est exigé pour l'adopter.
 */
export function usePatientDuplicateDetection(email: string, phone: string, enabled: boolean) {
  const [duplicate, setDuplicate] = useState<PatientLookupResult | null>(null);
  const suppressKeyRef = useRef('');

  useEffect(() => {
    const em = email.trim();
    const ph = phone.trim();
    if (!enabled || (!em && !ph.replace(/\D/g, ''))) {
      setDuplicate(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await lookupPatientByContact(em, ph);
          if (stale) return;
          if (!found || suppressKeyRef.current === suppressKey(em, ph, found.patient.id)) {
            setDuplicate(null);
            return;
          }
          setDuplicate(found);
        } catch (e) {
          if (!stale) setDuplicate(null);
          console.warn('[patients] duplicate lookup failed', e);
        }
      })();
    }, 450);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [email, enabled, phone]);

  const dismissDuplicate = useCallback(() => {
    if (duplicate) suppressKeyRef.current = suppressKey(email, phone, duplicate.patient.id);
    setDuplicate(null);
  }, [duplicate, email, phone]);

  const resetDuplicate = useCallback(() => {
    suppressKeyRef.current = '';
    setDuplicate(null);
  }, []);

  return { duplicate, dismissDuplicate, resetDuplicate, showDuplicate: setDuplicate };
}
