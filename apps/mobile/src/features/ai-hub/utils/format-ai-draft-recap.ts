import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import {
  formatAvailabilityDisplayFr,
  formatFrenchWeekdayDate,
} from '@/utils/appointment-datetime-fr';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export interface AiDraftRecapDisplay {
  typeLabel: string;
  categoryName: string | null;
  serviceLabels: string[];
  scheduleLabel: string | null;
  addressLabel: string | null;
  profileDocuments: string[];
  attachedDocuments: string[];
  missingDocuments: string[];
}

function serviceLabelFromEntry(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  const category = typeof row.category_name === 'string' ? row.category_name.trim() : '';
  return name || category || null;
}

/** Labels récap — fallback payload si l’API n’a pas encore enrichRecap (pré-déploiement). */
export function getAiDraftRecapDisplay(draft: AiAppointmentDraft): AiDraftRecapDisplay {
  const recap = draft.recap ?? {};
  const payload = draft.payload ?? {};
  const formData = asRecord(payload.form_data) ?? {};

  const recapServices = Array.isArray(recap.services) ? recap.services : [];
  const payloadServices = Array.isArray(payload.selected_services) ? payload.selected_services : [];
  const serviceLabels =
    recapServices.length > 0
      ? recapServices
          .map((s) => serviceLabelFromEntry(s))
          .filter((s): s is string => Boolean(s))
      : payloadServices
          .map((s) => serviceLabelFromEntry(s))
          .filter((s): s is string => Boolean(s));

  const type = String(recap.type ?? payload.type ?? 'nursing');
  const typeLabel =
    serviceLabels.length > 1
      ? `${serviceLabels.length} prestations`
      : type === 'nursing'
        ? 'Soin infirmier'
        : 'Prélèvement';

  const categoryName =
    serviceLabels.length === 1
      ? serviceLabels[0]!
      : (typeof recap.category_name === 'string' && recap.category_name.trim()) ||
        (typeof payload.category_name === 'string' && payload.category_name.trim()) ||
        null;

  const scheduledAt =
    (typeof recap.scheduled_at === 'string' ? recap.scheduled_at : null) ??
    (typeof payload.scheduled_at === 'string' ? payload.scheduled_at : null) ??
    (typeof formData.scheduled_at === 'string' ? formData.scheduled_at : null);

  const availability = formData.availability ?? payload.availability;

  const dateLabel =
    (typeof recap.date_label === 'string' && recap.date_label.trim()) ||
    (scheduledAt ? formatFrenchWeekdayDate(scheduledAt) : null);

  const slotLabel =
    (typeof recap.slot_label === 'string' && recap.slot_label.trim()) ||
    formatAvailabilityDisplayFr(availability, scheduledAt) ||
    null;

  const scheduleParts = [dateLabel, slotLabel].filter(Boolean);
  const scheduleLabel =
    scheduleParts.length > 0
      ? scheduleParts.join(' · ')
      : scheduledAt
        ? formatFrenchWeekdayDate(scheduledAt)
        : null;

  const addressLabel =
    (typeof recap.address_label === 'string' && recap.address_label.trim()) ||
    (() => {
      const address = asRecord(payload.address);
      return address && typeof address.label === 'string' ? address.label : null;
    })();

  const attachedDocuments =
    recap.attached_documents ??
    (() => {
      const files = asRecord(payload.files) ?? asRecord(formData.files);
      if (!files) return [];
      return Object.keys(files).filter((k) => files[k] != null);
    })();

  return {
    typeLabel,
    categoryName,
    serviceLabels,
    scheduleLabel,
    addressLabel,
    profileDocuments: recap.profile_documents ?? [],
    attachedDocuments,
    missingDocuments: recap.missing_documents ?? [],
  };
}
