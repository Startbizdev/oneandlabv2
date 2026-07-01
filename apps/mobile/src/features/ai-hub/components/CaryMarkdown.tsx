import type { ReactNode } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { fontFamily, fontSize, lh } from '@/theme/typography';

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

  t = t.replace(/\s+-\s+(?=[A-ZÀ-Ü0-9«])/g, '\n- ');
  t = t.replace(/(?<!\n\n)(?<=\S)\s+(?=(?:Valeurs|Points|En résumé|Pour résumer|Ce qui|En bref|Côté|NFS|Foie|Rein|Lipides|À retenir)[^\n.]{2,48}:)/gi, '\n\n');

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function isSectionHeading(line: string): boolean {
  const cleaned = line.trim();
  if (cleaned.length < 4 || cleaned.length > 56) return false;
  if (/^[-•*]\s/.test(cleaned)) return false;
  return /^[^:\n]{2,52}:$/.test(cleaned);
}

/** Découpe le texte assistant en paragraphes, titres et listes. */
export function parseMessageBlocks(raw: string): MessageBlock[] {
  const normalized = preprocessAssistantText(raw);
  if (!normalized) return [];

  const chunks = normalized.split(/\n{2,}/).filter((c) => c.trim() !== '');
  const blocks: MessageBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');

    if (lines.length === 1 && isSectionHeading(lines[0]!)) {
      blocks.push({ type: 'heading', text: lines[0]!.replace(/:$/, '') });
      continue;
    }

    if (lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l))) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => l.replace(/^[-•*]\s+/, '').trim()),
      });
      continue;
    }

    if (lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => l.replace(/^\d+[.)]\s+/, '').trim()),
      });
      continue;
    }

    blocks.push({ type: 'paragraph', lines });
  }

  return blocks;
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
      <Text key={`b-${index++}`} style={[style, { fontFamily: fontFamily.semiBold }]}>
        {match[1]}
      </Text>,
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
    <Text key={key} style={style}>
      {renderInlineBold(cleaned, style)}
    </Text>
  );
}

/** Texte assistant aéré — paragraphes, titres, listes à puces. */
export function CaryMarkdown({
  text,
  style,
  inverse,
}: {
  text: string;
  style?: TextStyle;
  inverse?: boolean;
}) {
  const blocks = parseMessageBlocks(text ?? '');

  const baseStyle: TextStyle = {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lh(fontSize.base, 1.55),
    ...(inverse ? { color: '#fff' } : null),
    ...style,
  };

  const headingStyle: TextStyle = {
    ...baseStyle,
    fontFamily: fontFamily.semiBold,
    lineHeight: lh(fontSize.base, 1.35),
  };

  if (blocks.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 14 }}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <Text key={`h-${blockIndex}`} style={headingStyle}>
              {block.text}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${blockIndex}`} style={{ gap: 8, paddingLeft: 2 }}>
              {block.items.map((item, itemIndex) => (
                <View key={`li-${blockIndex}-${itemIndex}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={[baseStyle, { lineHeight: lh(fontSize.base, 1.55), marginTop: 1 }]}>{'•'}</Text>
                  <Text style={[baseStyle, { flex: 1 }]}>
                    {renderInlineBold(stripStrayMarkdown(item), baseStyle)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.lines.length === 1) {
          return renderLine(block.lines[0]!, baseStyle, `p-${blockIndex}`);
        }

        return (
          <View key={`p-${blockIndex}`} style={{ gap: 6 }}>
            {block.lines.map((line, lineIndex) => renderLine(line, baseStyle, `p-${blockIndex}-l-${lineIndex}`))}
          </View>
        );
      })}
    </View>
  );
}
