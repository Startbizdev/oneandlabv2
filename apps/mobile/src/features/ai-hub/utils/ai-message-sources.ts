import type { AiMessageSource, AiMessageSourceType } from '@oneandlab/shared-types';

const SOURCE_FALLBACK_LABELS: Record<AiMessageSourceType, string> = {
  document: 'Document',
  appointment: 'Rendez-vous',
  result: 'Résultat',
  prescription: 'Ordonnance',
};

function isSourceType(value: unknown): value is AiMessageSourceType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SOURCE_FALLBACK_LABELS, value);
}

/** `message.sources` validées et dédoublonnées ; les entrées inconnues sont ignorées. */
export function normalizeAiMessageSources(raw: unknown): AiMessageSource[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const sources: AiMessageSource[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { type, id, label } = item as Record<string, unknown>;
    if (!isSourceType(type) || typeof id !== 'string' || !id.trim()) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      type,
      id,
      label: typeof label === 'string' && label.trim() ? label.trim() : SOURCE_FALLBACK_LABELS[type],
    });
  }
  return sources;
}

/** Suggestions de relance renvoyées avec une réponse (`data.suggestions`). */
export function normalizeAiFollowUpSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) unique.add(item.trim());
  }
  return [...unique].slice(0, 3);
}
