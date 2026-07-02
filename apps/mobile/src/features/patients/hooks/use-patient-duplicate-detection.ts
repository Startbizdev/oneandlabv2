import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupPatientByContact } from '@/features/patients/api/patient-lookup.service';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';

/** Détecte un patient existant par email ou téléphone (debounce 450 ms). */
export function usePatientDuplicateDetection(email: string, phone: string, enabled: boolean) {
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateRow, setDuplicateRow] = useState<PatientRow | null>(null);
  const suppressKeyRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLookup = useCallback(async () => {
    if (!enabled) return;
    const em = email.trim();
    const ph = phone.trim();
    if (!em && !ph.replace(/\D/g, '')) {
      setDuplicateOpen(false);
      setDuplicateRow(null);
      return;
    }

    try {
      const res = await lookupPatientByContact(em, ph);
      const row = res.success ? res.data : null;
      if (!row?.id) {
        setDuplicateOpen(false);
        setDuplicateRow(null);
        return;
      }
      const suppress = `${em}|${ph}|${row.id}`;
      if (suppressKeyRef.current === suppress) return;
      setDuplicateRow(row);
      setDuplicateOpen(true);
    } catch {
      /* silencieux */
    }
  }, [email, enabled, phone]);

  useEffect(() => {
    if (!enabled) {
      setDuplicateOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runLookup();
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email, enabled, phone, runLookup]);

  const dismissDuplicate = useCallback(() => {
    if (duplicateRow?.id) {
      suppressKeyRef.current = `${email.trim()}|${phone.trim()}|${duplicateRow.id}`;
    }
    setDuplicateOpen(false);
    setDuplicateRow(null);
  }, [duplicateRow, email, phone]);

  const resetDuplicate = useCallback(() => {
    suppressKeyRef.current = '';
    setDuplicateOpen(false);
    setDuplicateRow(null);
  }, []);

  return {
    duplicateOpen,
    duplicateRow,
    dismissDuplicate,
    resetDuplicate,
    setDuplicateOpen,
    setDuplicateRow,
  };
}
