import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { getAiDraftRecapDisplay } from './format-ai-draft-recap';
import { AI_DRAFT_DOC_LABELS, getAiDraftDocumentEntries } from './ai-draft-documents';

export type AiDraftRecapBullet = {
  label: string;
  value: string;
  docType?: string;
  medicalDocumentId?: string;
};

/** Lignes récap Cary — texte simple avec puces (multi-soins + options catalogue). */
export function buildAiDraftRecapBullets(draft: AiAppointmentDraft): AiDraftRecapBullet[] {
  const display = getAiDraftRecapDisplay(draft);
  const rows: AiDraftRecapBullet[] = [];
  const payload = draft.payload ?? {};
  const formData =
    payload.form_data && typeof payload.form_data === 'object' && !Array.isArray(payload.form_data)
      ? (payload.form_data as Record<string, unknown>)
      : {};
  const services = Array.isArray(payload.selected_services) ? payload.selected_services : [];

  const beneficiaryName =
    (typeof draft.recap?.beneficiary_name === 'string' && draft.recap.beneficiary_name.trim()) ||
    [formData.first_name, formData.last_name]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .join(' ');
  if (beneficiaryName) {
    rows.push({ label: 'Pour', value: beneficiaryName });
  }

  if (services.length > 1) {
    for (const svc of services) {
      if (!svc || typeof svc !== 'object') continue;
      const name =
        (typeof svc.name === 'string' && svc.name.trim()) ||
        (typeof svc.category_name === 'string' && svc.category_name.trim()) ||
        'Soin';
      rows.push({ label: 'Soin', value: name });
    }
  } else {
    const soin =
      display.serviceLabels.length > 1
        ? display.serviceLabels.join(', ')
        : display.categoryName ?? display.serviceLabels[0] ?? 'Rendez-vous';
    rows.push({ label: 'Soin', value: soin });
  }

  const careLines = draft.recap?.care_option_lines;
  if (Array.isArray(careLines)) {
    for (const line of careLines) {
      const trimmed = String(line).trim();
      if (!trimmed) continue;
      const sep = trimmed.indexOf(' : ');
      if (sep > 0) {
        rows.push({
          label: trimmed.slice(0, sep).trim(),
          value: trimmed.slice(sep + 3).trim(),
        });
      } else {
        rows.push({ label: 'Détail', value: trimmed });
      }
    }
  }

  if (display.scheduleLabel) {
    rows.push({ label: 'Quand', value: display.scheduleLabel });
  }
  if (display.addressLabel) {
    rows.push({ label: 'Où', value: display.addressLabel });
  }

  for (const entry of getAiDraftDocumentEntries(draft)) {
    rows.push({
      label: 'Document',
      value: AI_DRAFT_DOC_LABELS[entry.type] ?? entry.label,
      docType: entry.type,
      medicalDocumentId: entry.medical_document_id,
    });
  }

  return rows;
}
