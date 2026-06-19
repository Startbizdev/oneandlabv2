function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DISCLAIMER_PATTERNS = [
  /cary est un assistant informatif[^.!?]*[.!?]?/gi,
  /il ne remplace pas un avis m[eé]dical[^.!?]*[.!?]?/gi,
  /en cas d['']urgence[^.!?]*[.!?]?/gi,
  /(?:contactez|appelez|composez)\s*(?:le\s*)?(?:15|112|samu|pompiers)[^.!?]*[.!?]?/gi,
  /(?:15|112)\s*(?:ou|\/)\s*(?:112|15)[^.!?]*[.!?]?/gi,
  /(?:urgence|samu)\s*[:\—–-]\s*(?:contactez|appelez)?[^.!?]*[.!?]?/gi,
  /(?:rappel|disclaimer|note)\s*[:\—–-]\s*[^\n]+/gi,
];

/** Clés internes Cary IA — jamais visibles dans le chat. */
const INTERNAL_AI_PATTERNS = [
  /\((?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[^)]+\)/gi,
  /(?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[\w-]+/gi,
  /\*\*\((?:patient_mode|booking_step)[^)]+\)\*\*/gi,
];

/** Retire disclaimer / urgence / tokens internes du corps du message. */
export function stripDisclaimerFromAssistantText(text: string, disclaimer?: string): string {
  let out = text.trim();
  const d = disclaimer?.trim();

  if (d) {
    if (out.includes(d)) {
      out = out.replace(d, '').trim();
    }
    for (const sentence of d.split(/(?<=[.!?…])\s+/)) {
      const s = sentence.trim();
      if (s.length < 10) continue;
      if (out.toLowerCase().includes(s.toLowerCase())) {
        out = out.replace(new RegExp(escapeRegExp(s), 'gi'), '').trim();
      }
    }
  }

  for (const pattern of [...DISCLAIMER_PATTERNS, ...INTERNAL_AI_PATTERNS]) {
    out = out.replace(pattern, '').trim();
  }

  out = out
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/^[\s\-–—•*]+|[\s\-–—•*]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return out;
}
