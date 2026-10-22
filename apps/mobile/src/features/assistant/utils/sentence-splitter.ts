/** Abréviations suivies d'un point qui ne terminent pas une phrase (« Dr. Martin »). */
const ABBREVIATIONS = new Set([
  'dr',
  'pr',
  'm',
  'mm',
  'mme',
  'mmes',
  'mlle',
  'mr',
  'st',
  'ste',
  'cf',
  'env',
  'ex',
  'p',
  'n°',
  'no',
  'vol',
  'av',
  'bd',
  'tél',
  'tel',
]);

/**
 * Fin de phrase : ponctuation finale, éventuels guillemets ou parenthèses fermants (espace française admise),
 * puis un blanc ; ou saut de ligne.
 */
const BOUNDARY = /[.!?…]+(?:[\s  ]?["»)\]])*\s+|\n+/g;

function isFalseStop(before: string, punctuation: string): boolean {
  if (!punctuation.startsWith('.') || punctuation.startsWith('..')) return false;
  const word = /([^\s«("]+)$/.exec(before)?.[1] ?? '';
  if (ABBREVIATIONS.has(word.toLowerCase())) return true;
  // Initiale (« J. Dupont ») ou numéro de liste (« 1. »).
  return /^\p{Lu}$/u.test(word) || /^\d{1,2}$/.test(word);
}

/** Texte lisible à voix haute : sans markdown ni puces. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*(?:#+|[-•*]|\d{1,2}[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakable(text: string): string | null {
  const cleaned = cleanForSpeech(text);
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : null;
}

/**
 * Découpe un flux de texte en phrases complètes au fil de l'eau (lecture vocale phrase par phrase).
 * `push` renvoie les phrases terminées ; `flush` rend le reste en fin de flux.
 */
export function createSentenceSplitter() {
  let buffer = '';

  return {
    push(delta: string): string[] {
      buffer += delta;
      const sentences: string[] = [];
      let start = 0;
      BOUNDARY.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = BOUNDARY.exec(buffer)) !== null) {
        const end = match.index + match[0].length;
        if (!match[0].startsWith('\n') && isFalseStop(buffer.slice(start, match.index), match[0])) continue;
        const sentence = speakable(buffer.slice(start, end));
        if (sentence) sentences.push(sentence);
        start = end;
      }
      buffer = buffer.slice(start);
      return sentences;
    },
    flush(): string | null {
      const rest = speakable(buffer);
      buffer = '';
      return rest;
    },
  };
}
