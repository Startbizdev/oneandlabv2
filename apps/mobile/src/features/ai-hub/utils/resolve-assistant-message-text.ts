/** Retire les blocs techniques (booking_patch, json) du texte streamé brut. */
function stripBookingArtifacts(text: string): string {
  return text
    .replace(/```booking_patch\s*\n?[\s\S]*?```/gi, '')
    .replace(/```json\s*\n?[\s\S]*?```/gi, '')
    .replace(/```\s*\n?[\s\S]*?```/g, (block) => {
      const inner = block.replace(/```/g, '').trim();
      if (/^[\s{[]/.test(inner) && /"category_id"|"booking_step"|"selected_services"/.test(inner)) {
        return '';
      }
      return block;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Aère le texte pendant le stream (aligné backend formatReadableChatText). */
function aerateStreamText(text: string): string {
  let t = text.replace(/\*\*(.+?)\*\*/g, '$1');
  if (!/\n{2,}/.test(t) && t.length > 180) {
    t = t.replace(/(?<=[.!?…])\s+(?=[A-ZÀ-Ü«])/g, '\n\n');
  }
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Texte assistant à persister après stream : le serveur nettoie souvent le contenu
 * (booking_patch retiré) alors que le stream affichait le brut.
 */
export function resolveAssistantMessageText(
  serverContent: string | null | undefined,
  assembledStream: string,
): string {
  const fromServer = (serverContent ?? '').trim();
  const fromStream = aerateStreamText(stripBookingArtifacts(assembledStream));
  const text = fromServer || fromStream;
  return text || '…';
}
