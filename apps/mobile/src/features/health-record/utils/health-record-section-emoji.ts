/** Emojis par section — titres du carnet de santé. */
const SECTION_EMOJI: Record<string, string> = {
  /** Taille & poids */
  general: '📏',
  /** Cœur, tension, cholestérol */
  cardio: '💓',
  /** Diabète, thyroïde */
  metabolic: '🍎',
  /** Allergies */
  allergies: '🤧',
  /** Traitements en cours */
  treatments: '💊',
  /** Tabac, alcool, activité */
  lifestyle: '🌿',
  /** Chirurgies & hospitalisations */
  surgical: '🩹',
  /** Antécédents familiaux */
  family: '🧬',
  /** Gynécologie */
  gynecology: '🤰',
};

export const HEALTH_RECORD_SECTION_FALLBACK_EMOJI = '📋';

export function healthRecordSectionEmoji(sectionId: string): string {
  return SECTION_EMOJI[sectionId] ?? HEALTH_RECORD_SECTION_FALLBACK_EMOJI;
}

/** Map exportée pour le dashboard web (même source sémantique). */
export const HEALTH_RECORD_SECTION_EMOJI_MAP = { ...SECTION_EMOJI };
