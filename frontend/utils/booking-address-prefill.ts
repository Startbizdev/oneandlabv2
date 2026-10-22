/**
 * Le tunnel a déjà une adresse pour ce RDV (brouillon, saisie, choix du bénéficiaire par le parent,
 * ou effacement volontaire) : le préremplissage depuis le profil ou le proche ne doit pas l'écraser.
 */
export function bookingAddressAlreadyChosen(model: unknown): boolean {
  if (!model || typeof model !== 'object') return false;
  const values = model as Record<string, unknown>;
  const address = values.address;
  if (typeof address === 'string' && address.trim()) return true;
  if (address && typeof address === 'object') {
    const label = (address as { label?: unknown }).label;
    if (typeof label === 'string' && label.trim()) return true;
  }
  // Clé posée uniquement par l'état émis par le formulaire : une adresse vide y est un effacement voulu.
  return 'address_complement' in values;
}
