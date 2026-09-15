/** Decorative symbols shared by web and native. Labels remain the source of meaning. */
export type CareSymbol = 'droplet' | 'syringe' | 'bandage' | 'heart-pulse' | 'shower-head' | 'stethoscope';

export function careSymbol(category: { name?: string | null; label?: string | null; type?: string | null }): CareSymbol {
  if (category.type === 'blood_test') return 'droplet';
  const label = `${category.name ?? ''} ${category.label ?? ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/prelev|prise de sang|analyse sanguine/.test(label)) return 'droplet';
  if (/inject|vaccin|perfusion/.test(label)) return 'syringe';
  if (/pansement|plaie|suture/.test(label)) return 'bandage';
  if (/toilette|hygiene/.test(label)) return 'shower-head';
  if (/surveillance|suivi|tension|diabet/.test(label)) return 'heart-pulse';
  return 'stethoscope';
}

/** Selected catalogue icon, shared by web and native; old emoji use a semantic fallback. */
export function explicitCareIcon(icon?: string | null): string | null {
  let value = String(icon ?? '').trim();
  value = value.replace(/^i-(medical-icon|healthicons|lucide|covid)-/, '$1:');
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) value = `lucide:${value}`;
  if (value === 'lucide:pulse') value = 'lucide:activity';
  if (value === 'lucide:first-aid') value = 'lucide:briefcase-medical';
  return /^(lucide|medical-icon|healthicons|covid):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;
}

export function resolveCareCategoryIcon(category: { icon?: string | null; name?: string | null; type?: string | null }): string {
  return explicitCareIcon(category.icon) ?? `lucide:${careSymbol(category)}`;
}
