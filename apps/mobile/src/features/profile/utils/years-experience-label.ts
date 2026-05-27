const YEARS_LABELS: Record<string, string> = {
  '1': "1 an d'expérience",
  '3': '3 ans d\'expérience',
  '5': '5 ans d\'expérience',
  '10': '10 ans d\'expérience',
  '10_plus': 'Expert (+10 ans)',
};

export function yearsExperienceLabel(value?: string | null): string | null {
  const key = value?.trim();
  if (!key) return null;
  return YEARS_LABELS[key] ?? key;
}
