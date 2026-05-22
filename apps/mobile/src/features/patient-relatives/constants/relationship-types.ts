export const RELATIONSHIP_OPTIONS = [
  { value: 'child', label: 'Enfant' },
  { value: 'parent', label: 'Parent' },
  { value: 'spouse', label: 'Conjoint(e)' },
  { value: 'sibling', label: 'Frère / Sœur' },
  { value: 'grandparent', label: 'Grand-parent' },
  { value: 'grandchild', label: 'Petit-enfant' },
  { value: 'other', label: 'Autre' },
] as const;

export function relationshipLabel(type?: string | null): string {
  if (!type) return '';
  return RELATIONSHIP_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
