import {
  careCategoryEmojiForCategory,
  isBloodTestAppointment,
  isNursingAppointment,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';

/** Tous les actes du panier appartenant au même lot que le représentant actif. */
export function servicesInActiveLot(
  selectedServices: SelectedServiceInput[],
  activeServiceId: string | null | undefined,
): SelectedServiceInput[] {
  if (!activeServiceId) return [];
  const rep = selectedServices.find((s) => s.id === activeServiceId);
  if (!rep) return [];
  if (isBloodTestAppointment(rep.type)) {
    return selectedServices.filter((s) => isBloodTestAppointment(s.type));
  }
  if (isNursingAppointment(rep.type)) {
    return selectedServices.filter((s) => isNursingAppointment(s.type));
  }
  return [rep];
}

export type BookingWizardLotKind = 'blood' | 'nursing' | 'other';

export function bookingWizardLotKind(service: SelectedServiceInput): BookingWizardLotKind {
  if (isBloodTestAppointment(service.type)) return 'blood';
  if (isNursingAppointment(service.type)) return 'nursing';
  return 'other';
}

export function bookingWizardLotStepLabel(kind: BookingWizardLotKind): string {
  if (kind === 'blood') return 'Prélèvement';
  if (kind === 'nursing') return 'Soins infirmiers';
  return 'Prestation';
}

/** Libellé soin avec emoji (catalogue / `icon` / type). */
export function bookingWizardServiceDisplayName(svc: SelectedServiceInput): string {
  const name = String(svc.name ?? '').trim();
  if (!name) return '';
  const emoji = careCategoryEmojiForCategory({
    name,
    icon: svc.icon ?? null,
    type: svc.type,
  });
  if (!emoji || name.startsWith(emoji)) return name;
  return `${emoji} ${name}`;
}

/** Titre du lot (un ou plusieurs actes). */
export function bookingWizardLotTitle(
  lotServices: SelectedServiceInput[],
  kind: BookingWizardLotKind,
): string {
  if (lotServices.length === 0) return '';
  if (lotServices.length === 1) return bookingWizardServiceDisplayName(lotServices[0]);
  if (kind === 'blood') return 'Prélèvements';
  if (kind === 'nursing') return 'Soins infirmiers';
  return lotServices.map((s) => bookingWizardServiceDisplayName(s)).join(', ');
}
