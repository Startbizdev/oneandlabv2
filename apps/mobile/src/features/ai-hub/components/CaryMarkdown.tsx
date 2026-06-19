import type { ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Markdown minimal (gras) — hérite la taille du style parent. */
export function CaryMarkdown({
  text,
  style,
  inverse,
}: {
  text: string;
  style?: TextStyle;
  inverse?: boolean;
}) {
  const safe = text ?? '';
  const parts = safe.split(/(\*\*[^*]+\*\*)/g);
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(
        <Text key={`b-${index}`} style={[style, { fontFamily: fontFamily.semiBold }]}>
          {part.slice(2, -2)}
        </Text>,
      );
    } else if (part) {
      nodes.push(part);
    }
  });

  return (
    <Text
      style={[
        {
          fontFamily: fontFamily.regular,
          fontSize: fontSize.base,
          lineHeight: lh(fontSize.base, 1.45),
        },
        style,
        inverse ? { color: '#fff' } : undefined,
      ]}
    >
      {nodes}
    </Text>
  );
}
