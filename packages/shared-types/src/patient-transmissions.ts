/** Transmissions ciblées de l'équipe soignante — `GET/POST/PATCH /patients/:id/transmissions`. */
export type TransmissionAuthorRole = 'nurse' | 'pro';

/** Soin coché : soin d'un passage du jour (`nursing_item`) ou soin infirmier du catalogue (`category`). */
export type TransmissionCareItemKind = 'nursing_item' | 'category';

export interface TransmissionCareItemRef {
  kind: TransmissionCareItemKind;
  id: string;
}

/** Libellé figé côté serveur au moment de l'enregistrement. */
export interface TransmissionCareItem extends TransmissionCareItemRef {
  label: string;
}

export interface PatientTransmission {
  id: string;
  patient_id: string;
  /** Jour du soin (Y-m-d, Europe/Paris), jamais dans le futur. */
  occurred_on: string;
  body: string;
  care_items: TransmissionCareItem[];
  appointment_id: string | null;
  for_doctor: boolean;
  author: { id: string | null; name: string | null; role: TransmissionAuthorRole };
  created_at: string;
  edited_at: string | null;
  /** Auteur connecté et moins de 24 h depuis la création. */
  can_edit: boolean;
}

export interface PatientTransmissionsPage {
  items: PatientTransmission[];
  /** Curseur (Y-m-d exclu) de la page suivante, `null` en fin de fil. */
  next_before: string | null;
}

export interface PatientTransmissionInput {
  body: string;
  occurred_on?: string;
  care_items?: TransmissionCareItemRef[];
  appointment_id?: string | null;
  for_doctor?: boolean;
}

export interface TransmissionPassageCareItem extends TransmissionCareItem {
  kind: 'nursing_item';
  appointment_id: string;
  done: boolean;
}

/** `GET /patients/:id/transmission-care-items?date=` — soins proposés à la saisie. */
export interface TransmissionCareItemsForDate {
  date: string;
  passage_items: TransmissionPassageCareItem[];
  categories: TransmissionCareItem[];
}

export const TRANSMISSION_BODY_MAX_LENGTH = 4000;
