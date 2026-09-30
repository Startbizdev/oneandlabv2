export type LabPreferenceMode = 'platform_match' | 'brand_choice';

export interface LabBrandPublic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
}

export interface LabBrandAdmin extends LabBrandPublic {
  is_active: boolean;
  /** Comptes labo qui reçoivent les RDV « réseau choisi » (dans leur zone). */
  lab_ids?: string[];
  /** RDV existants qui ont choisi ce réseau (perdent ce choix si la marque est supprimée). */
  appointment_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Capacité d'un compte labo à recevoir un RDV réseau (GET /admin/lab-brands/labs). */
export interface LabBrandLabReachability {
  id: string;
  has_active_zone: boolean;
  is_accepting_appointments: boolean;
}

export function isLabPreferenceMode(value: unknown): value is LabPreferenceMode {
  return value === 'platform_match' || value === 'brand_choice';
}
