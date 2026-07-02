export type PatientAbsenceType = 'hospitalization' | 'leave' | 'other';

export interface PatientAbsence {
  id: string;
  patient_id: string;
  nurse_id: string;
  absence_type: PatientAbsenceType;
  type_label_fr: string;
  note?: string | null;
  start_date: string;
  end_date: string;
  card_label_fr: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientAbsenceInput {
  absence_type: PatientAbsenceType;
  start_date: string;
  end_date: string;
  note?: string | null;
}
