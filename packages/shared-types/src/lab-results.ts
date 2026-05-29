/** Résultats d'analyses (blood_test) — liste transversale par rôle. */

export type LabResultListItem = {
  id: string;
  medical_document_id: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  created_at?: string | null;
  appointment_id: string;
  appointment_scheduled_at?: string | null;
  category_name?: string | null;
  patient_id?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
};

export type LabResultsListResponse = {
  items: LabResultListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
