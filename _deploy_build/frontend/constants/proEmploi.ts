/**
 * Professions de santé (hors infirmier) pour les pros.
 * Utilisé à l'inscription /pro/register et dans le profil /profile.
 *
 * Référence réglementation France :
 * - Prescription prise de sang / examens biologiques : médecin, sage-femme, chirurgien-dentiste (dans son champ).
 * - Orientation / délivrance : pharmacien (peut orienter le patient, délivrer sur ordonnance).
 * - Opticien-lunetier, kiné, psychologue, diététicien, etc. : pas de droit de prescription pour analyses
 *   sanguines ni soins infirmiers ; ce sont des professions de santé au sens large.
 */
export const PRO_SANTE_EMPLOIS = [
  // Peuvent prescrire ou orienter pour RDV prise de sang / soins infirmiers (code de la santé publique)
  { label: 'Médecin généraliste', value: 'Médecin généraliste' },
  { label: 'Médecin spécialiste', value: 'Médecin spécialiste' },
  { label: 'Sage-femme', value: 'Sage-femme' },
  { label: 'Pharmacien', value: 'Pharmacien' },
  { label: 'Chirurgien-dentiste', value: 'Chirurgien-dentiste' },
 
] as const

export type ProEmploiValue = (typeof PRO_SANTE_EMPLOIS)[number]['value']
