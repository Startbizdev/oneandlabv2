export type MarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const LIST_ITEM = /^\s*(?:[-•*]|\d{1,2}[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;

/**
 * Markdown réduit de Cary : titres `#`, listes `-` / `1.`, paragraphes, gras `**…**`.
 * Comme en Markdown standard, un simple retour à la ligne reste dans le paragraphe ; une ligne vide en ouvre un autre.
 */
export function parseMarkdown(raw: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
    } else if (HEADING.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'heading', text: trimmed.replace(HEADING, '') });
    } else if (LIST_ITEM.test(trimmed)) {
      flushParagraph();
      const item = trimmed.replace(LIST_ITEM, '');
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
    } else {
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  return blocks;
}

/** Segments gras / normal d'une ligne ; un `**` orphelin (flux en cours) est masqué. */
export function parseInline(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) => ({ text: index % 2 === 1 ? part : part.replace(/\*\*/g, ''), bold: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0);
}
