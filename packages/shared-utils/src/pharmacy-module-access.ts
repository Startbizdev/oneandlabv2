import type { PharmacyModuleConfig, PharmacyModuleUiFlags } from '@oneandlab/shared-types';

export type PharmacyAccessUser = {
  role?: string | null;
  emploi?: string | null;
  pharmacy_orders_enabled?: boolean | number | null;
  pharmacy_orders_paused?: boolean | number | null;
};

export function canOrderPharmacy(user: PharmacyAccessUser, config: PharmacyModuleConfig): boolean {
  if (!config.module_enabled) return false;
  const role = (user.role ?? '').trim();
  return [
    'super_admin',
    'admin',
    'nurse',
    'pro',
    'preleveur',
    'lab',
    'subaccount',
    'patient',
  ].includes(role);
}

export function isPharmacyAccount(
  user: PharmacyAccessUser,
  receivers: string[] = ['Pharmacien'],
): boolean {
  if ((user.role ?? '') !== 'pro') return false;
  const emploi = (user.emploi ?? '').trim();
  if (!emploi) return false;
  return receivers.some(
    (r) => r.localeCompare(emploi, undefined, { sensitivity: 'accent' }) === 0,
  );
}

export function canReceivePharmacyOrders(
  user: PharmacyAccessUser,
  config: PharmacyModuleConfig,
): boolean {
  if (!config.module_enabled) return false;
  if (!isPharmacyAccount(user, config.pharmacy_receiver_emplois)) return false;
  if (!user.pharmacy_orders_enabled) return false;
  if (user.pharmacy_orders_paused) return false;
  return true;
}

export function canShowOrderTab(user: PharmacyAccessUser, flags: PharmacyModuleUiFlags): boolean {
  return flags.module_enabled && flags.can_order;
}

export function canShowReceiveTab(user: PharmacyAccessUser, flags: PharmacyModuleUiFlags): boolean {
  return flags.module_enabled && flags.can_receive;
}
