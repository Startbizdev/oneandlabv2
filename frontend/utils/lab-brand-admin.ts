export interface LabAccountOption {
  id: string;
  label: string;
  email?: string;
  hasActiveZone: boolean;
  acceptsAppointments: boolean;
}

export interface BrandLabStatus {
  tone: 'success' | 'warning' | 'neutral';
  label: string;
  blocked: { id: string; label: string; reason: string }[];
}

export function labBlockReason(lab: LabAccountOption | undefined): string | null {
  if (!lab) return 'compte labo inactif ou introuvable';
  if (!lab.hasActiveZone) return 'aucune zone de prise de sang active';
  if (!lab.acceptsAppointments) return 'n’accepte pas les rendez-vous';
  return null;
}

export function brandLabStatus(labIds: readonly string[], labsById: ReadonlyMap<string, LabAccountOption>): BrandLabStatus {
  if (labIds.length === 0) {
    return { tone: 'neutral', label: 'Aucun labo : RDV traités par l’administration', blocked: [] };
  }
  const blocked: BrandLabStatus['blocked'] = [];
  let receiving = 0;
  for (const id of labIds) {
    const lab = labsById.get(id);
    const reason = labBlockReason(lab);
    if (reason) blocked.push({ id, label: lab?.label ?? 'Compte labo', reason });
    else receiving += 1;
  }
  if (receiving === 0) {
    return { tone: 'warning', label: 'Aucun labo ne peut recevoir : RDV traités par l’administration', blocked };
  }
  const receivingLabel = receiving === 1 ? '1 labo reçoit les RDV' : `${receiving} labos reçoivent les RDV`;
  if (blocked.length === 0) return { tone: 'success', label: receivingLabel, blocked };
  return {
    tone: 'warning',
    label: `${receivingLabel}, ${blocked.length === 1 ? '1 ne recevra rien' : `${blocked.length} ne recevront rien`}`,
    blocked,
  };
}

export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Comptes labo dont le nom ou l'email contient le nom de la marque ; ceux qui peuvent recevoir d'abord. */
export function suggestLabsForBrand(
  brandName: string,
  labs: readonly LabAccountOption[],
  selectedIds: readonly string[],
): LabAccountOption[] {
  const key = normalizeForMatch(brandName);
  if (key.length < 3) return [];
  return labs
    .filter(lab => !selectedIds.includes(lab.id) && normalizeForMatch(`${lab.label} ${lab.email ?? ''}`).includes(key))
    .sort((a, b) => Number(labBlockReason(a) !== null) - Number(labBlockReason(b) !== null) || a.label.localeCompare(b.label, 'fr'));
}

export function filterBrandsByName<T extends { name: string }>(brands: readonly T[], query: string): T[] {
  const key = normalizeForMatch(query);
  if (!key) return [...brands];
  return brands.filter(brand => normalizeForMatch(brand.name).includes(key));
}

export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  const index = ids.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
