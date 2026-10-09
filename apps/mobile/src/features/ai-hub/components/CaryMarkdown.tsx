import type { ReactNode } from 'react';
import { AppText, font, lh, spacing, useTheme } from '@/theme';
import { Row } from '@/components/layout/primitives';
import { View, type TextStyle } from 'react-native';

export type MessageBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'heading'; text: string };

/** Prépare le texte brut assistant (pavés LLM → paragraphes lisibles). */
export function preprocessAssistantText(raw: string): string {
  let t = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!t) return '';

  t = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s+/gm, '');

  if (!/\n{2,}/.test(t) && t.length > 180) {
    t = t.replace(/(?<=[.!?…])\s+(?=[A-ZÀ-Ü«])/g, '\n\n');
  }

  t = t.replace(/[ \t]+-[ \t]+(?=[A-ZÀ-Ü0-9«])/g, '\n- ');
  t = t.replace(/(?<!\n\n)(?<=\S)\s+(?=(?:Valeurs|Points|En résumé|Pour résumer|Ce qui|En bref|Côté|NFS|Foie|Rein|Lipides|À retenir)[^\n.]{2,48}:)/gi, '\n\n');

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function isSectionHeading(line: string): boolean {
  const cleaned = line.trim();
  if (cleaned.length < 4 || cleaned.length > 56) return false;
  if (/^[-•*]\s/.test(cleaned)) return false;
  return /^[^:\n]{2,52}:$/.test(cleaned);
}

const BULLET_MARKER = /^[-•*]\s+/;
const NUMBER_MARKER = /^\d+[.)]\s+/;

/** Lignes d'un même bloc : texte suivi d'une liste (« Voici : » puis « - … ») donne titre / paragraphe puis liste. */
function linesToBlocks(lines: string[]): MessageBlock[] {
  const runs: { marker: RegExp | null; lines: string[] }[] = [];
  for (const line of lines) {
    const marker = BULLET_MARKER.test(line) ? BULLET_MARKER : NUMBER_MARKER.test(line) ? NUMBER_MARKER : null;
    const last = runs.at(-1);
    if (last && last.marker === marker) last.lines.push(line);
    else runs.push({ marker, lines: [line] });
  }

  return runs.map(({ marker, lines: runLines }): MessageBlock => {
    if (marker) return { type: 'list', items: runLines.map((l) => l.replace(marker, '').trim()) };
    const [only] = runLines;
    if (runLines.length === 1 && only !== undefined && isSectionHeading(only)) {
      return { type: 'heading', text: only.replace(/\s*:$/, '') };
    }
    return { type: 'paragraph', lines: runLines };
  });
}

/** Découpe le texte assistant en paragraphes, titres et listes. */
export function parseMessageBlocks(raw: string): MessageBlock[] {
  const normalized = preprocessAssistantText(raw);
  if (!normalized) return [];

  return normalized
    .split(/\n{2,}/)
    .map((chunk) =>
      chunk
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== ''),
    )
    .flatMap(linesToBlocks);
}

function stripStrayMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
}

function renderInlineBold(text: string, style?: TextStyle): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    nodes.push(
      <AppText key={`b-${index++}`} style={[style, { ...font.semiBold }]}>
        {match[1]}
      </AppText>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(stripStrayMarkdown(text.slice(last)));
  }

  if (nodes.length === 0) {
    nodes.push(stripStrayMarkdown(text));
  }

  return nodes;
}

function renderLine(line: string, style: TextStyle, key: string) {
  const cleaned = line.trim();
  if (!cleaned) return null;
  return (
    <AppText key={key} style={style}>
      {renderInlineBold(cleaned, style)}
    </AppText>
  );
}

/** Texte assistant aéré — paragraphes, titres, listes à puces. */
export function CaryMarkdown({ text, style }: { text: string; style?: TextStyle }) {
  const { colors: c, fontSize } = useTheme();
  const blocks = parseMessageBlocks(text ?? '');

  const baseStyle: TextStyle = {
    ...font.regular,
    fontSize: fontSize.base,
    lineHeight: lh(fontSize.base, 1.55),
    color: c.textPrimary,
    ...style,
  };

  const headingStyle: TextStyle = {
    ...baseStyle,
    ...font.semiBold,
    lineHeight: lh(fontSize.base, 1.35),
  };

  if (blocks.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: spacing[3] }}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <AppText key={`h-${blockIndex}`} style={headingStyle}>
              {block.text}
            </AppText>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${blockIndex}`} style={{ gap: spacing[2] }}>
              {block.items.map((item, itemIndex) => (
                <Row key={`li-${blockIndex}-${itemIndex}`} gap={spacing[2]} align="start" style={{ minWidth: 0 }}>
                  <AppText style={baseStyle}>{'•'}</AppText>
                  <AppText style={[baseStyle, { minWidth: 0, flex: 1 }]}>
                    {renderInlineBold(stripStrayMarkdown(item), baseStyle)}
                  </AppText>
                </Row>
              ))}
            </View>
          );
        }

        if (block.lines.length === 1) {
          return renderLine(block.lines[0]!, baseStyle, `p-${blockIndex}`);
        }

        return (
          <View key={`p-${blockIndex}`} style={{ gap: spacing[1.5] }}>
            {block.lines.map((line, lineIndex) => renderLine(line, baseStyle, `p-${blockIndex}-l-${lineIndex}`))}
          </View>
        );
      })}
    </View>
  );
}
