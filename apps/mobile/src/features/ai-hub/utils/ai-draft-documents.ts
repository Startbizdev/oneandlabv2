import type { AiAppointmentDraft } from '@oneandlab/shared-types';

export type AiDraftDocumentEntry = {
  type: string;
  label: string;
  source: 'profile' | 'appointment';
  medical_document_id: string;
  file_name?: string | null;
};

const PROFILE_DOC_TYPES = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'] as const;

const DOC_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte mutuelle',
  autres_assurances: 'Autres assurances',
  ordonnance: 'Ordonnance',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function fileRefToEntry(type: string, ref: unknown): AiDraftDocumentEntry | null {
  const row = asRecord(ref);
  if (!row) return null;
  const medId = typeof row.medical_document_id === 'string' ? row.medical_document_id.trim() : '';
  if (!medId) return null;
  const isProfile = (PROFILE_DOC_TYPES as readonly string[]).includes(type);

  return {
    type,
    label: DOC_LABELS[type] ?? type,
    source: isProfile ? 'profile' : 'appointment',
    medical_document_id: medId,
    file_name: typeof row.file_name === 'string' ? row.file_name : null,
  };
}

/** Entrées documents pour le récap Cary (API enrichie ou fallback payload). */
export function getAiDraftDocumentEntries(draft: AiAppointmentDraft): AiDraftDocumentEntry[] {
  const recap = draft.recap ?? {};
  const fromRecap = recap.document_entries;
  if (Array.isArray(fromRecap) && fromRecap.length > 0) {
    return fromRecap
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        const type = typeof r.type === 'string' ? r.type : '';
        const medId = typeof r.medical_document_id === 'string' ? r.medical_document_id : '';
        if (!type || !medId) return null;
        return {
          type,
          label: typeof r.label === 'string' ? r.label : (DOC_LABELS[type] ?? type),
          source: r.source === 'appointment' ? 'appointment' : 'profile',
          medical_document_id: medId,
          file_name: typeof r.file_name === 'string' ? r.file_name : null,
        } satisfies AiDraftDocumentEntry;
      })
      .filter((e): e is NonNullable<typeof e> => e != null) as AiDraftDocumentEntry[];
  }

  const payload = draft.payload ?? {};
  const formData = asRecord(payload.form_data) ?? {};
  const merged = { ...asRecord(formData.files), ...asRecord(payload.files) };
  const order = ['carte_vitale', 'carte_mutuelle', 'autres_assurances', 'ordonnance'];
  const entries: AiDraftDocumentEntry[] = [];

  for (const type of order) {
    const entry = fileRefToEntry(type, merged?.[type]);
    if (entry) entries.push(entry);
  }

  return entries;
}

export { DOC_LABELS as AI_DRAFT_DOC_LABELS, PROFILE_DOC_TYPES as AI_PROFILE_DOC_TYPES };
