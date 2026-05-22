import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { formatStreetAndDistrictWithoutStreetNumber } from '@/utils/offer-address-display';
import {
  formatBloodTestSeriesDurationDays,
  getAppointmentNotes,
  getFrequencyLabel,
  getNursingDurationLabel,
} from '@/utils/appointment-detail-display';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

type AptExt = Appointment & Record<string, unknown>;

export function offerCategoryLabel(appt: Appointment): string {
  const ext = appt as AptExt;
  const niRaw =
    Array.isArray(ext.nursing_items_display) && ext.nursing_items_display.length > 0
      ? ext.nursing_items_display
      : Array.isArray(ext.nursing_items) && ext.nursing_items.length > 0
        ? ext.nursing_items
        : [];
  if (appt.type && isNursingAppointment(appt.type) && niRaw.length > 1) {
    const parts = niRaw
      .map((x: { label?: string; category_name?: string }) =>
        String(x?.label ?? x?.category_name ?? '').trim(),
      )
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
    return 'Soins infirmiers (multi-actes)';
  }
  const fromRoot = String(appt.category_name ?? '').trim();
  const fd = appt.form_data as { category_name?: string } | undefined;
  const fromForm = String(fd?.category_name ?? '').trim();
  if (fromRoot) return fromRoot;
  if (fromForm) return fromForm;
  if (isNursingAppointment(appt.type)) return 'Soins infirmiers';
  if (isBloodTestAppointment(appt.type)) return 'Prélèvement';
  return 'Soin';
}

export function offerDurationLabel(appt: Appointment): string {
  const fd = (appt.form_data ?? {}) as Record<string, unknown>;
  if (!fd.duration_days) return '';
  if (isNursingAppointment(appt.type)) {
    return getNursingDurationLabel(
      String(fd.duration_days),
      fd.custom_days as number | null | undefined,
    );
  }
  if (isBloodTestAppointment(appt.type)) {
    return formatBloodTestSeriesDurationDays(
      String(fd.duration_days),
      fd.custom_days as number | null | undefined,
    );
  }
  return '';
}

export function offerAddressLine(appt: Appointment): string {
  const raw = (appointmentAddressLine(appt) || '').trim();
  if (!raw) return '—';
  return formatStreetAndDistrictWithoutStreetNumber(raw) || raw;
}

export function offerAvailabilityLabel(appt: Appointment): string {
  const fd = appt.form_data as { availability?: unknown } | undefined;
  return formatAvailabilityDisplayFr(fd?.availability, appt.scheduled_at) || '';
}

/** Libellé modal / liste : « Disponibilité : Toute la journée »… */
export function offerAvailabilityDisplayLine(appt: Appointment): string {
  const avail = offerAvailabilityLabel(appt);
  if (!avail) return '';
  return `Disponibilité : ${avail}`;
}

export function offerDateTimeLabel(appt: Appointment): string {
  if (!appt.scheduled_at) return '';
  const d = dayjs(appt.scheduled_at);
  const date = d.format('dddd D MMMM YYYY');
  const cap = date.charAt(0).toUpperCase() + date.slice(1);
  const slot = offerAvailabilityLabel(appt);
  return slot ? `${cap} · ${slot}` : cap;
}

export function offerDateShort(appt: Appointment): string {
  if (!appt.scheduled_at) return '';
  const fd = appt.form_data as { availability?: unknown } | undefined;
  if (fd?.availability) {
    const d = dayjs(appt.scheduled_at);
    return d.format('D MMM');
  }
  const d = dayjs(appt.scheduled_at);
  const full = d.format('ddd D MMM · HH[h]mm');
  return full.charAt(0).toUpperCase() + full.slice(1);
}

export function offerFrequencyLabel(appt: Appointment): string {
  const fd = appt.form_data as { frequency?: string } | undefined;
  if (!fd?.frequency) return '';
  return getFrequencyLabel(fd.frequency);
}

export function offerBloodTestTypeLabel(appt: Appointment): string {
  const fd = appt.form_data as { blood_test_type?: string } | undefined;
  const t = fd?.blood_test_type;
  if (t === 'single') return 'Ponctuel';
  if (t === 'series') return 'Série';
  return t ? String(t) : '';
}

export function offerBatchLotSummaryLabel(batch: Appointment[]): string {
  const n = batch.length;
  if (n < 2) return '';
  const labOnly = batch.every((r) => isBloodTestAppointment(r.type));
  const nurseOnly = batch.every((r) => isNursingAppointment(r.type));
  if (labOnly) return `Lot · ${n} prélèvements · une acceptation`;
  if (nurseOnly) return `Lot · ${n} actes infirmiers · une acceptation`;
  return `Lot · ${n} rendez-vous · une acceptation`;
}

export function offerNursingMultiActCount(appt: Appointment): number {
  const ext = appt as AptExt;
  const raw =
    Array.isArray(ext.nursing_items_display) && ext.nursing_items_display.length
      ? ext.nursing_items_display
      : Array.isArray(ext.nursing_items)
        ? ext.nursing_items
        : [];
  return raw.length > 1 ? raw.length : 0;
}

export function offerShowBatchCard(batch: Appointment[], primary: Appointment): boolean {
  if (batch.length > 1) return true;
  return offerNursingMultiActCount(primary) > 1;
}

export type OfferLabPartner = {
  displayName: string;
  profileImageUrl?: string | null;
  publicSlug?: string | null;
  phone?: string;
  roleLabel?: string;
};

export function offerLabPartnerFromAppointment(appt: Appointment): OfferLabPartner | null {
  const ext = appt as AptExt;
  const labId = String(ext.assigned_lab_id ?? '').trim();
  if (!labId) return null;
  const displayName = String(
    ext.assigned_lab_display_name ?? ext.assigned_lab_name ?? '',
  ).trim();
  const slug = String(ext.assigned_lab_public_slug ?? '').trim();
  if (!displayName && !slug) return null;
  const role =
    ext.assigned_lab_role === 'subaccount' ? 'Sous-compte laboratoire' : 'Laboratoire';
  return {
    displayName: displayName || 'Laboratoire',
    profileImageUrl: String(ext.assigned_lab_profile_image_url ?? '') || null,
    publicSlug: slug || null,
    phone: String(ext.assigned_lab_phone ?? '').trim() || undefined,
    roleLabel: role,
  };
}

export { getAppointmentNotes as offerAppointmentNotes };
