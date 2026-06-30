import { unref, type Ref } from 'vue';

/**
 * Lit le rendez-vous depuis la ref du composant AppointmentDetailPage.
 * defineExpose peut exposer un Ref ; unref() gère Ref et valeur brute.
 */
export function getAppointmentFromDetailRef(
  detailRef: Ref<{ appointment?: unknown } | null | undefined>,
): any | null {
  const inst = detailRef.value;
  if (!inst) return null;
  const raw = inst.appointment;
  if (raw === undefined || raw === null) return null;
  return unref(raw as any);
}

/** Lot trié (page courante + fratries), exposé par `AppointmentDetailPage`. */
export function getBatchAppointmentsSortedFromDetailRef(
  detailRef: Ref<{ batchAppointmentsSorted?: unknown } | null | undefined>,
): any[] {
  const inst = detailRef.value;
  if (!inst) return [];
  const raw = inst.batchAppointmentsSorted as any;
  if (raw === undefined || raw === null) return [];
  const v = unref(raw);
  return Array.isArray(v) ? v : [];
}

export function getDocumentsFromDetailRef(
  detailRef: Ref<{ documents?: unknown } | null | undefined>,
): any[] {
  const inst = detailRef.value;
  if (!inst) return [];
  const v = unref(inst.documents as any);
  return Array.isArray(v) ? v : [];
}
