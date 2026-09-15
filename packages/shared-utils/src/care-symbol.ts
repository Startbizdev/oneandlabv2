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
