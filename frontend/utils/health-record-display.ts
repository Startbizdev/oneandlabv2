export function healthRecordStaffHeroSubtitle(percent: number, missingCount = 0): string {
  if (percent >= 100) return 'Carnet à jour.';
  if (missingCount > 0) {
    return missingCount === 1
      ? '1 information à compléter.'
      : `${missingCount} informations à compléter.`;
  }
  if (percent >= 75) return 'Presque complet.';
  if (percent >= 35) return 'Données partiellement renseignées.';
  return 'Carnet peu renseigné.';
}
