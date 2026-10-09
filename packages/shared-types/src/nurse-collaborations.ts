/** Binôme infirmier : confrère ajouté par le titulaire sur un RDV, une série de passages ou une période. */
export type NurseCollaborationScope = 'appointment' | 'series' | 'range';

/** Élément de `GET /nurse/collaborations` et réponse de `POST /nurse/collaborations`. */
export interface NurseCollaboration {
  id: string;
  scope: NurseCollaborationScope;
  owner_nurse_id: string;
  owner_name: string;
  co_nurse_id: string;
  co_nurse_name: string;
  co_nurse_profile_image_url?: string | null;
  appointment_id?: string | null;
  passage_series_id?: string | null;
  /** `YYYY-MM-DD`, renseignées pour la portée `range`. */
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  /** Titulaire ou confrère : chacun peut retirer la collaboration. */
  can_remove: boolean;
}

export interface NurseCollaborationCreateBody {
  co_nurse_id: string;
  scope: NurseCollaborationScope;
  appointment_id?: string;
  passage_series_id?: string;
  start_date?: string;
  end_date?: string;
}

/** Confrère visible sur un RDV, une ligne d'agenda ou un arrêt de tournée. */
export interface AppointmentCoNurse {
  id: string;
  name: string;
}
