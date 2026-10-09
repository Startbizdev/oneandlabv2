function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Avertissements répétitifs non urgents, retirés du corps de la réponse. */
const DISCLAIMER_PATTERNS = [
  /cary est un assistant informatif[^.!?]*[.!?]?/gi,
  /il ne remplace pas un avis m[eé]dical[^.!?]*[.!?]?/gi,
  /(?:rappel|disclaimer|note)\s*[:\—–-]\s*[^\n]+/gi,
];

/** Consigne d'urgence (15, 112, 3114, SAMU, urgences) : jamais retirée d'une réponse. */
const EMERGENCY_INSTRUCTION = /(?<!\d)(?:15|112|3114)(?!\d)|\bsamu\b|urgences?/i;

function isEmergencyInstruction(text: string): boolean {
  return EMERGENCY_INSTRUCTION.test(text);
}

function removeUnlessEmergency(text: string, pattern: RegExp): string {
  return text.replace(pattern, (match) => (isEmergencyInstruction(match) ? match : '')).trim();
}

/** Clés internes Cary IA — jamais visibles dans le chat. */
const INTERNAL_AI_PATTERNS = [
  /\((?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[^)]+\)/gi,
  /(?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[\w-]+/gi,
  /\*\*\((?:patient_mode|booking_step)[^)]+\)\*\*/gi,
];

/**
 * Nettoie les restes d'un retrait (espaces, puces orphelines) sans toucher
 * aux paragraphes ni aux listes du message.
 */
function tidyLayout(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]*[-–—•*]+[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\s\-–—•]+$/, '')
    .trim();
}

function stripInternalTokensOnly(text: string): string {
  let out = text.trim();
  for (const pattern of INTERNAL_AI_PATTERNS) {
    out = out.replace(pattern, '').trim();
  }
  return tidyLayout(out);
}

/** Retire l'avertissement répété et les tokens internes ; les consignes d'urgence restent. */
export function stripDisclaimerFromAssistantText(text: string, disclaimer?: string): string {
  const original = text.trim();
  if (!original) return '';

  let out = original;
  const d = disclaimer?.trim();

  if (d) {
    if (out.includes(d) && !isEmergencyInstruction(d)) {
      out = out.replace(d, '').trim();
    }
    for (const sentence of d.split(/(?<=[.!?…])\s+/)) {
      const s = sentence.trim();
      if (s.length < 10 || isEmergencyInstruction(s)) continue;
      if (out.toLowerCase().includes(s.toLowerCase())) {
        out = out.replace(new RegExp(escapeRegExp(s), 'gi'), '').trim();
      }
    }
  }

  for (const pattern of DISCLAIMER_PATTERNS) {
    out = removeUnlessEmergency(out, pattern);
  }
  for (const pattern of INTERNAL_AI_PATTERNS) {
    out = out.replace(pattern, '').trim();
  }

  out = tidyLayout(out);

  if (!out && original) {
    return stripInternalTokensOnly(original);
  }

  return out;
}
