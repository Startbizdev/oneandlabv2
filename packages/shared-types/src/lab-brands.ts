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
  created_at?: string;
  updated_at?: string;
}

export function isLabPreferenceMode(value: unknown): value is LabPreferenceMode {
  return value === 'platform_match' || value === 'brand_choice';
}
