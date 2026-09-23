import type { PharmacyOrder } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS, PHARMACY_ORDER_STATUS_LABELS } from '@oneandlab/shared-constants';
import { formatParisDayMonthYear, formatParisHm, parseParisWallClock } from '@/utils/paris-datetime';

export function pharmacyOrderStatusLabel(status: PharmacyOrder['status']): string {
  return PHARMACY_ORDER_STATUS_LABELS[status] ?? status;
}

export function pharmacyFulfillmentLabel(mode: PharmacyOrder['fulfillment_mode']): string {
  return PHARMACY_FULFILLMENT_LABELS[mode] ?? mode;
}

export function formatPharmacyOrderDate(iso?: string): string {
  const ms = parseParisWallClock(iso);
  if (ms == null) return '';
  return `${formatParisDayMonthYear(ms)} · ${formatParisHm(ms)}`;
}

export function personDisplayName(
  first?: string | null,
  last?: string | null,
  fallback = '—',
): string {
  const name = [first?.trim(), last?.trim()].filter(Boolean).join(' ');
  return name || fallback;
}

export function pharmacyOrderBeneficiaryLabel(order: {
  patient_display_name?: string | null;
  relative_display_name?: string | null;
  patient_id?: string;
}): string {
  if (order.relative_display_name?.trim()) return order.relative_display_name.trim();
  if (order.patient_display_name?.trim()) return order.patient_display_name.trim();
  return 'Patient';
}

export function pharmacyOrderPharmacyLabel(order: {
  pharmacy_display_name?: string | null;
}): string {
  return order.pharmacy_display_name?.trim() || 'Pharmacie';
}

/** Qui a passé la commande, vu par le patient (pas par le demandeur lui-même). */
export function pharmacyOrderOrderedByLabel(
  order: {
    requester_id?: string;
    patient_id?: string;
    requester_role?: string;
    requester_display_name?: string | null;
    requester_emploi?: string | null;
  },
  viewerId?: string | null,
  opts?: { pharmacyView?: boolean },
): string | null {
  const name = order.requester_display_name?.trim();
  if (!name) return null;
  if (viewerId && order.requester_id === viewerId) return null;
  if (order.requester_id && order.patient_id && order.requester_id === order.patient_id) return null;
  if (opts?.pharmacyView) {
    if (order.requester_role === 'nurse') return `Infirmier · ${name}`;
    if (order.requester_emploi?.trim()) return `${order.requester_emploi.trim()} · ${name}`;
    if (order.requester_role === 'pro') return `Professionnel de santé · ${name}`;
    return name;
  }
  if (order.requester_role === 'nurse') return `Commandé par votre infirmier · ${name}`;
  if (order.requester_role === 'pro') return `Commandé par votre professionnel · ${name}`;
  return `Commandé par ${name}`;
}

export function pharmacyOrderHasStaffRequester(order: {
  requester_id?: string;
  pharmacy_id?: string;
  patient_id?: string;
  requester_role?: string;
}): boolean {
  const requesterId = order.requester_id?.trim();
  if (!requesterId) return false;
  if (order.patient_id && requesterId === order.patient_id) return false;
  if (order.pharmacy_id && requesterId === order.pharmacy_id) return false;
  return order.requester_role === 'nurse' || order.requester_role === 'pro';
}
