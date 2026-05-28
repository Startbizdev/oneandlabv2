/** Hub recherche staff — patients, documents, échanges (liste unifiée). */

export type StaffHubPatientItem = {
  kind: 'patient';
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  profile_image_url?: string | null;
  created_by?: string | null;
  subtitle?: string;
  activity_at?: string | null;
};

export type StaffHubDocumentItem = {
  kind: 'document';
  id: string;
  medical_document_id?: string | null;
  patient_document_id?: string | null;
  patient_id: string;
  patient_name: string;
  patient_profile_image_url?: string | null;
  document_type: string;
  title: string;
  file_name?: string | null;
  source: 'profile' | 'appointment' | 'relative';
  appointment_id?: string | null;
  relative_id?: string | null;
  relative_name?: string | null;
  subtitle?: string;
  activity_at?: string | null;
};

export type StaffHubExchangeItem = {
  kind: 'exchange';
  id: string;
  medical_document_id: string;
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  patient_profile_image_url?: string | null;
  counterpart_name: string;
  last_message: string;
  subtitle?: string;
  activity_at?: string | null;
};

export type StaffHubSearchItem = StaffHubPatientItem | StaffHubDocumentItem | StaffHubExchangeItem;

export type StaffHubSearchResponse = {
  items: StaffHubSearchItem[];
};
