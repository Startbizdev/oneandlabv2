import {
  formatCareSelectValueWithAutreDetail,
  isCareAutreDetailKey,
} from '@oneandlab/shared-constants';
import { shouldHideAutrePreciserDetailRow } from '~/utils/rdv-care-display-label';

type CareOptionDef = {
  option_key: string;
  label: string;
  field_type?: string;
  sort_order?: number;
  options?: Array<{ value: string; label: string }>;
};

type CareCategoryLike = {
  label?: string;
  name?: string;
  options?: CareOptionDef[];
};

export function formatCareOptionRows(
  cat: CareCategoryLike | undefined,
  co: Record<string, string | number> | undefined,
): Array<{ label: string; value: string }> {
  if (!cat?.options?.length || !co) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const categoryLabel = cat.label ?? cat.name ?? '';
  for (const opt of [...cat.options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (isCareAutreDetailKey(opt.option_key)) continue;
    if (shouldHideAutrePreciserDetailRow(categoryLabel, opt.option_key)) continue;
    const raw = co[opt.option_key];
    if (raw === '' || raw === undefined || raw === null) continue;
    if (opt.field_type === 'select') {
      const choice = opt.options?.find((o) => String(o.value) === String(raw));
      const baseLabel = choice?.label ?? String(raw);
      const display = formatCareSelectValueWithAutreDetail(
        baseLabel,
        opt.option_key,
        raw,
        co as Record<string, unknown>,
      );
      rows.push({ label: opt.label, value: display });
    } else {
      rows.push({ label: opt.label, value: String(raw) });
    }
  }
  return rows;
}
