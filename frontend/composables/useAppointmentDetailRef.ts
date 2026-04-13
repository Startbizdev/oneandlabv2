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
