import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { countGroupedAppointmentPayloads } from '@oneandlab/shared-utils';

/** Libellé barre de progression (lots fusionnés = N RDV). */
export function bookingWizardProgressHint(
  selectedServices: SelectedServiceInput[],
  slotRowCount: number,
  documentsRowCount: number,
): string {
  const payloadCount = countGroupedAppointmentPayloads(selectedServices);
  const subSteps = Math.max(1, slotRowCount + documentsRowCount + 1);
  if (payloadCount > 1 && slotRowCount > 0) {
    return `${payloadCount} rendez-vous · ${subSteps} étapes`;
  }
  return '';
}
