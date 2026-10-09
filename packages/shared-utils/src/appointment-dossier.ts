/** Champs d'un RDV (mobile ou web) qui désignent le patient concerné. */
export type AppointmentDossierSubject = {
  patient_id?: string | null;
  relative_id?: string | null;
  relative_profile_id?: string | null;
  relative?: { id?: string | null; profile_id?: string | null } | null;
};

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Dossier patient concerné par un RDV : celui du proche quand le RDV est pris pour un proche, sinon le titulaire.
 * Proche encore sans dossier : `null`, jamais le titulaire (aucune donnée clinique du proche ne doit y partir).
 */
export function appointmentDossierPatientId(apt: AppointmentDossierSubject | null | undefined): string | null {
  if (!apt) return null;
  const relativeProfileId = clean(apt.relative_profile_id) || clean(apt.relative?.profile_id);
  if (relativeProfileId) return relativeProfileId;
  if (clean(apt.relative_id) || clean(apt.relative?.id)) return null;
  return clean(apt.patient_id) || null;
}
