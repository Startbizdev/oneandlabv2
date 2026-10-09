import type { AiReport } from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';

/** Compte rendu brouillon rédigé par Cary à partir d'une dictée (soignant, patient rattaché). */
export async function dictateAiReport(input: {
  patient_id: string;
  appointment_id?: string;
  transcript: string;
}): Promise<AiReport> {
  const res = await apiRequest<AiReport>('/ai/reports/dictate', { method: 'POST', body: input, timeout: 90_000 });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Compte rendu impossible');
  return res.data;
}

/** Corrige le texte d'un compte rendu encore brouillon (auteur uniquement ; 409 une fois validé). */
export async function updateAiReport(reportId: string, contentText: string): Promise<AiReport> {
  const res = await apiRequest<AiReport>(`/ai/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: { content_text: contentText },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Correction impossible');
  return res.data;
}

/** Valide un brouillon de compte rendu (brouillon → validé ; 409 si déjà validé ou publié). */
export async function validateAiReport(reportId: string): Promise<AiReport> {
  const res = await apiRequest<AiReport>(`/ai/reports/${encodeURIComponent(reportId)}/validate`, {
    method: 'POST',
    body: {},
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Validation impossible');
  return res.data;
}
