import { apiRequest } from '@/api/client';

export type HealthRecordQuestionType = 'yes_no_unknown' | 'text' | 'textarea' | 'number' | 'enum';

export interface HealthRecordQuestion {
  key: string;
  label_fr: string;
  type: HealthRecordQuestionType;
  optional?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface HealthRecordSection {
  id: string;
  label_fr: string;
  questions: HealthRecordQuestion[];
}

export interface HealthRecordGap {
  gap_key: string;
  status: string;
  label_fr: string;
  action?: string | null;
  cta_fr?: string | null;
}

export interface HealthRecordCompletion {
  percent: number;
  missing_sections: string[];
  missing_questions: string[];
  missing_count: number;
  open_gaps: HealthRecordGap[];
  computed_at?: string;
}

export interface HealthRecordRecapItem {
  key: string;
  label_fr: string;
  type: string;
  value: unknown;
  display: string;
}

export interface HealthRecordRecapSection {
  id: string;
  label_fr: string;
  items: HealthRecordRecapItem[];
}

export interface HealthRecordRecap {
  completion: HealthRecordCompletion;
  sections: HealthRecordRecapSection[];
  health_summary?: Record<string, unknown>;
  trends?: Array<{ observation_fr?: string }>;
  open_gaps: HealthRecordGap[];
  disclaimer_fr: string;
  staff_view?: boolean;
}

export interface HealthRecordSchema {
  version: string;
  disclaimer_fr: string;
  sections: HealthRecordSection[];
}

export async function fetchHealthRecordCompletion(): Promise<HealthRecordCompletion> {
  const res = await apiRequest<HealthRecordCompletion>('/health-record/completion');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Complétion indisponible');
  return res.data;
}

export async function fetchHealthRecordRecap(): Promise<HealthRecordRecap> {
  const res = await apiRequest<HealthRecordRecap>('/health-record/recap');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Récap indisponible');
  return res.data;
}

export async function fetchHealthRecordSchema(): Promise<HealthRecordSchema> {
  const res = await apiRequest<HealthRecordSchema>('/health-record/schema');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Schéma indisponible');
  return res.data;
}

export async function patchHealthRecordAnswers(
  answers: Record<string, { value: unknown }>,
): Promise<HealthRecordRecap> {
  const res = await apiRequest<HealthRecordRecap>('/health-record/answers', {
    method: 'PATCH',
    body: { answers },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Enregistrement impossible');
  return res.data;
}

export async function recordGapAction(
  gapKey: string,
  status: 'clicked' | 'dismissed' | 'shown' = 'clicked',
  actionKey = 'open',
): Promise<void> {
  const res = await apiRequest<unknown>(`/health-record/gaps/action?key=${encodeURIComponent(gapKey)}`, {
    method: 'POST',
    body: { status, action_key: actionKey },
  });
  if (!res.success) throw new Error(res.error ?? 'Action impossible');
}

export async function fetchStaffHealthRecord(patientId: string): Promise<HealthRecordRecap> {
  const res = await apiRequest<HealthRecordRecap>(`/patients/${patientId}/health-record`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Carnet indisponible');
  return res.data;
}

export async function patchStaffHealthRecordAnswers(
  patientId: string,
  answers: Record<string, { value: unknown }>,
): Promise<HealthRecordRecap> {
  const res = await apiRequest<HealthRecordRecap>(`/patients/${patientId}/health-record`, {
    method: 'PATCH',
    body: { answers },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Enregistrement impossible');
  return res.data;
}

export async function exportHealthRecord(): Promise<Record<string, unknown>> {
  const res = await apiRequest<Record<string, unknown>>('/health-record/export');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Export impossible');
  return res.data;
}
