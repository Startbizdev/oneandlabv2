import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { countGroupedAppointmentPayloads } from '@oneandlab/shared-utils';

/** Précision sous le stepper quand la sélection crée plusieurs RDV (lots fusionnés = N RDV). */
export function bookingWizardProgressHint(
  selectedServices: SelectedServiceInput[],
  slotRowCount: number,
): string {
  const payloadCount = countGroupedAppointmentPayloads(selectedServices);
  if (payloadCount > 1 && slotRowCount > 0) {
    return `Cette demande créera ${payloadCount} rendez-vous`;
  }
  return '';
}
