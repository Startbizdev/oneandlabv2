import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupPatientByEmail, lookupPatientByPhone } from '@/features/patients/api/patient-lookup.service';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFrenchPhoneLookup(phone: string): boolean {
  const d = phone.replace(/\D/g, '');
  return d.length >= 10 && (d.startsWith('0') || d.startsWith('33'));
}

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
    const emailOk = EMAIL_RE.test(em);
    const phoneOk = isFrenchPhoneLookup(ph);
    if (!emailOk && !phoneOk) {
      setDuplicateOpen(false);
      setDuplicateRow(null);
      return;
    }

    try {
      const res = emailOk
        ? await lookupPatientByEmail(em)
        : await lookupPatientByPhone(ph);
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
