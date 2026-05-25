import { api } from '@/api/client';
import { normalizeCategorySkipPrescriptionDocuments } from '@/utils/category-skip-prescription-documents';

export interface CareCategoryOption {
  option_key: string;
  label: string;
  field_type: 'select' | 'text' | 'number' | string;
  options?: { value: string; label: string }[] | null;
  is_required?: boolean;
  sort_order?: number;
}

export interface CareCategory {
  id: string;
  name: string;
  label: string;
  type: string;
  catalog_group?: string | null;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  skip_prescription_documents?: boolean;
  is_active?: boolean;
  options?: CareCategoryOption[];
}

function normalizeCategory(raw: Record<string, unknown>): CareCategory {
  const name = String(raw.name ?? raw.label ?? '');
  const opts = Array.isArray(raw.options) ? (raw.options as CareCategoryOption[]) : [];
  return {
    id: String(raw.id),
    name,
    label: name,
    type: String(raw.type ?? ''),
    catalog_group:
      raw.catalog_group != null
        ? String(raw.catalog_group)
        : raw.catalogGroup != null
          ? String(raw.catalogGroup)
          : null,
    description: raw.description != null ? String(raw.description) : null,
    icon: raw.icon != null ? String(raw.icon) : null,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    skip_prescription_documents: normalizeCategorySkipPrescriptionDocuments(
      raw.skip_prescription_documents,
    ),
    is_active: raw.is_active !== false,
    options: opts,
  };
}

export type CareCategoriesScope = 'full' | 'picker';

export async function fetchCareCategories(type?: string, scope: CareCategoriesScope = 'full') {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (scope === 'picker') params.set('scope', 'picker');
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get<Record<string, unknown>[]>(`/categories${q}`);
  if (!res.success || !res.data) return { ...res, data: [] as CareCategory[] };
  return {
    ...res,
    data: res.data.map((row) => normalizeCategory(row)),
  };
}

export async function fetchCareCategoryOptions(categoryId: string) {
  const res = await api.get<CareCategoryOption[]>(
    `/categories?category_options_for=${encodeURIComponent(categoryId)}`,
  );
  if (!res.success || !res.data) return { ...res, data: [] as CareCategoryOption[] };
  return res;
}
